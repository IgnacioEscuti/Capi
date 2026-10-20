import { env } from "../config/env.js";

// Acceso a la API de Mercado Pago. Cumple el mismo rol que un repository,
// pero contra una API externa en vez de la base: el service no sabe de URLs
// ni de fetch.

const URL_AUTORIZACION = "https://auth.mercadopago.com/authorization";
const URL_API = "https://api.mercadopago.com";
const TIMEOUT_MS = 15000;
const PAGOS_POR_PAGINA = 100;

// Error de una respuesta de MP. Lleva solo el status y la ruta, nunca el
// cuerpo: la respuesta del canje puede traer tokens y esto termina en logs.
export class ErrorMercadoPago extends Error {
  constructor(status, ruta) {
    super(`Mercado Pago respondió ${status} en ${ruta}`);
    this.status = status;
  }
}

async function pedir(ruta, opciones = {}) {
  const respuesta = await fetch(`${URL_API}${ruta}`, { ...opciones, signal: AbortSignal.timeout(TIMEOUT_MS) });
  // Se loguea la ruta sin query string (ahí van fechas, nada sensible, pero
  // así el mensaje queda corto).
  if (!respuesta.ok) throw new ErrorMercadoPago(respuesta.status, ruta.split("?")[0]);
  return respuesta.json();
}

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
};
