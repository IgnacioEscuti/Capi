import { api } from './api';

// La sincronización puede tardar más que el timeout general: el back le pega a
// MP (hasta 15 s por pedido) y pagina los resultados.
const TIMEOUT_SINCRONIZAR_MS = 30000;

// URL del login de MP. "returnUrl" es a dónde vuelve el back después (exp:// o capi://).
export async function obtenerUrlDeConexion(returnUrl) {
  const { data } = await api.get('/api/mp/conectar', { params: { returnUrl } });
  return data.url;
}

// { conectado, ultimaSincronizacion }
export async function obtenerEstadoMp() {
  const { data } = await api.get('/api/mp/estado');
  return data;
}

export async function desconectarMp() {
  await api.delete('/api/mp/conexion');
}

// { importados, ultimaSincronizacion }
export async function sincronizarMp() {
  const { data } = await api.post('/api/mp/sincronizar', null, { timeout: TIMEOUT_SINCRONIZAR_MS });
  return data;
}
