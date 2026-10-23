import { env } from "../config/env.js";

// Acceso a la API de Mercado Pago. Cumple el mismo rol que un repository,
// pero contra una API externa en vez de la base: el service no sabe de URLs
// ni de fetch.

const URL_AUTORIZACION = "https://auth.mercadopago.com/authorization";
const URL_API = "https://api.mercadopago.com";
const TIMEOUT_MS = 15000;
// Más corto para el reporte: es un paso extra de la sincronización y no
// tiene que frenarla si MP tarda.
const TIMEOUT_REPORTE_MS = 8000;
const PAGOS_POR_PAGINA = 100;
const RUTA_REPORTE = "/v1/account/release_report";

// Error de una respuesta de MP. Lleva solo el status y la ruta, nunca el
// cuerpo: la respuesta del canje puede traer tokens y esto termina en logs.
export class ErrorMercadoPago extends Error {
  constructor(status, ruta) {
    super(`Mercado Pago respondió ${status} en ${ruta}`);
    this.status = status;
  }
}

// "comoTexto" para el CSV del reporte; el resto de las respuestas son JSON.
async function pedir(ruta, { timeout = TIMEOUT_MS, comoTexto = false, ...opciones } = {}) {
  const respuesta = await fetch(`${URL_API}${ruta}`, { ...opciones, signal: AbortSignal.timeout(timeout) });
  // Se loguea la ruta sin query string (ahí van fechas, nada sensible, pero
  // así el mensaje queda corto).
  if (!respuesta.ok) throw new ErrorMercadoPago(respuesta.status, ruta.split("?")[0]);
  return comoTexto ? respuesta.text() : respuesta.json();
}

function pedirReporte(ruta, accessToken, opciones = {}) {
  return pedir(`${RUTA_REPORTE}${ruta}`, {
    ...opciones,
    timeout: TIMEOUT_REPORTE_MS,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  });
}

// Formato de fecha que pide la doc del reporte: ISO 8601 en UTC, sin milisegundos.
const fechaSinMs = (fecha) => fecha.toISOString().replace(/\.\d{3}Z$/, "Z");

function pedirToken(cuerpo) {
  return pedir("/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: env.MP_CLIENT_ID, client_secret: env.MP_CLIENT_SECRET, ...cuerpo }),
  });
}

export const mercadoPagoClient = {
  urlDeAutorizacion(state) {
    const parametros = new URLSearchParams({
      client_id: env.MP_CLIENT_ID,
      response_type: "code",
      platform_id: "mp",
      redirect_uri: env.MP_REDIRECT_URI,
      state,
    });
    return `${URL_AUTORIZACION}?${parametros}`;
  },

  // Devuelve { access_token, refresh_token, expires_in, user_id, ... }.
  canjearCodigo(code) {
    return pedirToken({ grant_type: "authorization_code", code, redirect_uri: env.MP_REDIRECT_URI });
  },

  // MP rota el refresh token: la respuesta trae uno nuevo y el viejo deja de servir.
  renovarToken(refreshToken) {
    return pedirToken({ grant_type: "refresh_token", refresh_token: refreshToken });
  },

  // Trae todos los pagos aprobados entre "desde" y "hasta" (por fecha de
  // aprobación), recorriendo las páginas hasta llegar al total.
  async buscarPagosAprobados(accessToken, desde, hasta) {
    const pagos = [];
    let offset = 0;

    while (true) {
      const parametros = new URLSearchParams({
        status: "approved",
        range: "date_approved",
        begin_date: desde.toISOString(),
        end_date: hasta.toISOString(),
        sort: "date_approved",
        criteria: "asc",
        limit: String(PAGOS_POR_PAGINA),
        offset: String(offset),
      });
      const { results, paging } = await pedir(`/v1/payments/search?${parametros}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      pagos.push(...results);
      offset += results.length;
      if (results.length === 0 || offset >= paging.total) return pagos;
    }
  },

  // --- Reporte de liquidaciones (release_report) ---

  // Devuelve la configuración del reporte, o null si la cuenta no tiene.
  async obtenerConfigReporte(accessToken) {
    try {
      return await pedirReporte("/config", accessToken);
    } catch (error) {
      if (error instanceof ErrorMercadoPago && error.status === 404) return null;
      throw error;
    }
  },

  crearConfigReporte(accessToken, config) {
    return pedirReporte("/config", accessToken, { method: "POST", body: JSON.stringify(config) });
  },

  actualizarConfigReporte(accessToken, config) {
    return pedirReporte("/config", accessToken, { method: "PUT", body: JSON.stringify(config) });
  },

  // Pide que se genere el reporte; MP lo arma después (asíncrono). El id que
  // devuelve no es el que aparece en /list, así que no se usa.
  async solicitarReporte(accessToken, desde, hasta) {
    await pedirReporte("", accessToken, {
      method: "POST",
      body: JSON.stringify({ begin_date: fechaSinMs(desde), end_date: fechaSinMs(hasta) }),
    });
  },

  // Reportes generados: [{ begin_date, end_date, file_name, ... }].
  listarReportes(accessToken) {
    return pedirReporte("/list", accessToken);
  },

  descargarReporte(accessToken, nombreArchivo) {
    return pedirReporte(`/${encodeURIComponent(nombreArchivo)}`, accessToken, { comoTexto: true });
  },
};
