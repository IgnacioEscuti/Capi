import { mpConexionRepository } from "../repositories/mpConexion.repository.js";
import { movimientoRepository } from "../repositories/movimiento.repository.js";
import { mercadoPagoClient, ErrorMercadoPago } from "../clients/mercadoPago.client.js";
import { enTransaccion } from "../config/database.js";
import { cifrar, descifrar } from "../utils/cifrado.utils.js";
import { generarStateMp, verificarStateMp } from "../utils/jwt.utils.js";
import { mapearPago } from "../utils/pagosMp.utils.js";
import { COLUMNAS_REPORTE, leerTransferencias } from "../utils/reporteMp.utils.js";
import { ErrorHttp } from "../utils/errorHttp.utils.js";

const UN_DIA_MS = 24 * 60 * 60 * 1000;
const DIAS_PRIMERA_SINCRONIZACION = 5;
const DIAS_MARGEN_SINCRONIZACION = 1;
const DIAS_ANTES_DE_RENOVAR = 7;
// Si un reporte pedido no aparece en este tiempo, se descarta y se pide otro.
const HORAS_PEDIDO_VENCIDO = 24;
// Argentina es UTC-3 todo el año (no tiene horario de verano desde 2009).
const DESFASE_AR_MS = 3 * 60 * 60 * 1000;

// Configuración del reporte de liquidaciones para una cuenta que no tiene.
// Sin generación automática, SFTP ni mails: Capi lo pide a mano en cada sincronización.
const CONFIG_REPORTE_INICIAL = {
  columns: COLUMNAS_REPORTE.map((key) => ({ key })),
  file_name_prefix: "capi",
  frequency: { type: "monthly", value: 1, hour: 0 }, // Solo se usaría si se programa (no se hace).
  display_timezone: "GMT-03",
  notification_email_list: [],
  include_withdrawal_at_end: false,
};

const MENSAJE_SIN_CONEXION = "No tenés Mercado Pago conectado";
const MENSAJE_RECONECTAR = "La conexión con Mercado Pago dejó de ser válida. Volvé a conectarla.";
const MENSAJE_MP_NO_RESPONDE = "Mercado Pago no respondió. Probá de nuevo en un rato.";

const restarDias = (fecha, dias) => new Date(fecha.getTime() - dias * UN_DIA_MS);

// Las 00:00 en hora argentina del día de "fecha". MP arma el reporte por
// días enteros, así que se le pide desde el comienzo del día.
const inicioDelDiaAr = (fecha) =>
  new Date(Math.floor((fecha.getTime() - DESFASE_AR_MS) / UN_DIA_MS) * UN_DIA_MS + DESFASE_AR_MS);

// Lo que devuelve /oauth/token, listo para guardar (tokens cifrados).
function tokensParaGuardar(respuesta) {
  if (!respuesta.access_token || !respuesta.refresh_token || !respuesta.expires_in) {
    throw new Error("La respuesta de /oauth/token de Mercado Pago no trae los tokens esperados");
  }
  return {
    accessToken: cifrar(respuesta.access_token),
    refreshToken: cifrar(respuesta.refresh_token),
    expiraEn: new Date(Date.now() + respuesta.expires_in * 1000),
  };
}

// 400/401/403 de MP = token o refresh token inválido, vencido o revocado:
// el usuario tiene que volver a conectar. Cualquier otro error (MP caído,
// timeout) → 502.
function traducirErrorMp(error) {
  if (error instanceof ErrorMercadoPago && [400, 401, 403].includes(error.status)) {
    return new ErrorHttp(409, MENSAJE_RECONECTAR);
  }
  if (error instanceof ErrorMercadoPago || error.name === "TimeoutError" || error.name === "TypeError") {
    console.error("Error al hablar con Mercado Pago:", error.message);
    return new ErrorHttp(502, MENSAJE_MP_NO_RESPONDE);
  }
  return error;
}

export class MercadoPagoService {
  constructor(repository, movimientoRepository, client) {
    this.repository = repository;
    this.movimientoRepository = movimientoRepository;
    this.client = client;
  }

  urlDeConexion(userId, returnUrl) {
    return this.client.urlDeAutorizacion(generarStateMp({ userId, returnUrl }));
  }

  // Valida el state y devuelve sus datos. Si no es válido, null: en ese caso
  // no hay una returnUrl confiable a la que redirigir.
  leerState(state) {
    try {
      return verificarStateMp(state);
    } catch {
      return null;
    }
  }

  async conectar(userId, code) {
    const respuesta = await this.client.canjearCodigo(code);
    await this.repository.guardar(userId, { mpUserId: respuesta.user_id, ...tokensParaGuardar(respuesta) });
  }

  async estado(userId) {
    const conexion = await this.repository.buscarPorUsuario(userId);
    return { conectado: Boolean(conexion), ultimaSincronizacion: conexion?.last_synced_at ?? null };
  }

  async desconectar(userId) {
    await this.repository.borrar(userId);
  }

  async sincronizar(userId) {
    const inicio = new Date();
    const conexion = await this.repository.buscarPorUsuario(userId);
    if (!conexion) throw new ErrorHttp(409, MENSAJE_SIN_CONEXION);

    const desde = conexion.last_synced_at
      ? restarDias(conexion.last_synced_at, DIAS_MARGEN_SINCRONIZACION)
      : restarDias(inicio, DIAS_PRIMERA_SINCRONIZACION);

    let accessToken;
    let pagos;
    try {
      accessToken = await this.accessTokenVigente(conexion);
      pagos = await this.client.buscarPagosAprobados(accessToken, desde, inicio);
    } catch (error) {
      throw traducirErrorMp(error);
    }

    const movimientos = pagos.map((pago) => mapearPago(pago, conexion.mp_user_id)).filter(Boolean);

    // Movimientos y fecha de sincronización juntos: si falla el INSERT no se
    // avanza last_synced_at y la próxima vez se vuelve a intentar el mismo rango.
    const importados = await enTransaccion(async (client) => {
      const cantidad = await this.movimientoRepository.crearImportados(userId, movimientos, client);
      await this.repository.registrarSincronizacion(userId, inicio, client);
      return cantidad;
    });

    const transferencias = await this.importarTransferencias(conexion, accessToken, inicio);

    return { importados: importados + transferencias, ultimaSincronizacion: inicio };
  }

  // Transferencias a bancos: no salen en /payments/search, solo en el reporte
  // de liquidaciones, que MP genera de forma asíncrona. Para no esperarlo,
  // cada sincronización importa el reporte que pidió la anterior (si ya está
  // listo) y deja pedido el siguiente. Nunca hace fallar la sincronización: si
  // algo sale mal se loguea y se reintenta la próxima vez.
  // Devuelve cuántas transferencias nuevas importó.
  async importarTransferencias(conexion, accessToken, inicio) {
    try {
      let importadas = 0;
      let cubiertoHasta = conexion.payouts_synced_until;
      let hayPedido = Boolean(conexion.payout_report_from);

      if (hayPedido) {
        const resultado = await this.importarReportePedido(conexion, accessToken);
        if (resultado !== null) {
          importadas = resultado;
          cubiertoHasta = conexion.payout_report_requested_at;
          hayPedido = false;
        } else if (inicio - conexion.payout_report_requested_at > HORAS_PEDIDO_VENCIDO * 60 * 60 * 1000) {
          await this.repository.cerrarPedidoDeReporte(conexion.user_id, null);
          hayPedido = false;
        }
      }

      // Un pedido por día: si se vuelve a pedir el mismo rango el mismo día,
      // MP no genera otro reporte (devuelve el que ya armó). El de mañana
      // arranca desde hoy, así que lo de hoy entra igual, con hasta un día de retraso.
      const yaCubiertoHoy = cubiertoHasta && inicioDelDiaAr(cubiertoHasta) >= inicioDelDiaAr(inicio);

      if (!hayPedido && !yaCubiertoHoy) {
        // Siempre desde el comienzo del último día cubierto: lo repetido no se
        // vuelve a insertar (ON CONFLICT) y así no se pierde nada de ese día.
        const desde = inicioDelDiaAr(cubiertoHasta ?? restarDias(conexion.connected_at, DIAS_PRIMERA_SINCRONIZACION));
        await this.asegurarConfigReporte(accessToken);
        await this.client.solicitarReporte(accessToken, desde, inicio);
        await this.repository.registrarPedidoDeReporte(conexion.user_id, desde, inicio);
      }

      return importadas;
    } catch (error) {
      console.error("No se pudieron importar las transferencias de Mercado Pago:", error.message);
      return 0;
    }
  }

  // Busca el reporte pedido entre los generados. Si todavía no está, devuelve
  // null; si está, importa sus transferencias y devuelve cuántas eran nuevas.
  async importarReportePedido(conexion, accessToken) {
    // MP redondea las fechas a días enteros según la zona horaria de la
    // cuenta, así que no se compara exacto: sirve el que empieza ese mismo
    // día y cubre hasta el momento del pedido.
    const desde = conexion.payout_report_from.getTime();
    const pedidoEn = conexion.payout_report_requested_at.getTime();
    const reporte = (await this.client.listarReportes(accessToken)).find(
      (r) =>
        r.file_name &&
        Math.abs(new Date(r.begin_date).getTime() - desde) < UN_DIA_MS &&
        new Date(r.end_date).getTime() >= pedidoEn
    );
    if (!reporte) return null;

    const movimientos = leerTransferencias(await this.client.descargarReporte(accessToken, reporte.file_name));

    return enTransaccion(async (client) => {
      const cantidad = await this.movimientoRepository.crearImportados(conexion.user_id, movimientos, client);
      await this.repository.cerrarPedidoDeReporte(conexion.user_id, conexion.payout_report_requested_at, client);
      return cantidad;
    });
  }

  // Si la cuenta no tiene configuración del reporte, se crea. Si ya tiene una
  // (propia del usuario o de antes), solo se le agregan las columnas que
  // falten: el resto no se toca.
  async asegurarConfigReporte(accessToken) {
    const config = await this.client.obtenerConfigReporte(accessToken);
    if (!config) {
      await this.client.crearConfigReporte(accessToken, CONFIG_REPORTE_INICIAL);
      return;
    }

    const columnas = config.columns ?? [];
    const faltantes = COLUMNAS_REPORTE.filter((key) => !columnas.some((columna) => columna.key === key));
    if (faltantes.length === 0) return;

    // "scheduled" es de solo lectura: se manda todo lo demás tal cual estaba.
    const { scheduled, ...resto } = config;
    await this.client.actualizarConfigReporte(accessToken, {
      ...resto,
      columns: [...columnas, ...faltantes.map((key) => ({ key }))],
    });
  }

  // Si al access token le quedan menos de 7 días, se renueva antes de usarlo.
  async accessTokenVigente(conexion) {
    const limite = new Date(Date.now() + DIAS_ANTES_DE_RENOVAR * UN_DIA_MS);
    if (conexion.expires_at > limite) return descifrar(conexion.access_token);

    const respuesta = await this.client.renovarToken(descifrar(conexion.refresh_token));
    await this.repository.actualizarTokens(conexion.user_id, tokensParaGuardar(respuesta));
    return respuesta.access_token;
  }
}

export const mercadoPagoService = new MercadoPagoService(mpConexionRepository, movimientoRepository, mercadoPagoClient);
