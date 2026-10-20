import { mpConexionRepository } from "../repositories/mpConexion.repository.js";
import { movimientoRepository } from "../repositories/movimiento.repository.js";
import { mercadoPagoClient, ErrorMercadoPago } from "../clients/mercadoPago.client.js";
import { enTransaccion } from "../config/database.js";
import { cifrar, descifrar } from "../utils/cifrado.utils.js";
import { generarStateMp, verificarStateMp } from "../utils/jwt.utils.js";
import { mapearPago } from "../utils/pagosMp.utils.js";
import { ErrorHttp } from "../utils/errorHttp.utils.js";

const UN_DIA_MS = 24 * 60 * 60 * 1000;
const DIAS_PRIMERA_SINCRONIZACION = 5;
const DIAS_MARGEN_SINCRONIZACION = 1;
const DIAS_ANTES_DE_RENOVAR = 7;

const MENSAJE_SIN_CONEXION = "No tenés Mercado Pago conectado";
const MENSAJE_RECONECTAR = "La conexión con Mercado Pago dejó de ser válida. Volvé a conectarla.";
const MENSAJE_MP_NO_RESPONDE = "Mercado Pago no respondió. Probá de nuevo en un rato.";

const restarDias = (fecha, dias) => new Date(fecha.getTime() - dias * UN_DIA_MS);

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

    let pagos;
    try {
      const accessToken = await this.accessTokenVigente(conexion);
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

    return { importados, ultimaSincronizacion: inicio };
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
