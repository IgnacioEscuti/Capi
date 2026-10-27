import { api } from './api';

// mes: "2026-10". Devuelve { mes, cantidadMovimientos, totalGastado, categorias: [{ categoria, total, cantidad }] }
// (categoria null = "Sin categoría").
export async function obtenerGastosPorCategoria(mes) {
  const { data } = await api.get('/api/reportes/categorias', { params: { mes } });
  return data;
}

// id: el de la categoría o "sin-categoria". Devuelve { mes, categoria, total, cantidad, totalGastado,
// meses: [{ mes, total }] (los 12 que terminan en "mes"), movimientos }.
export async function obtenerDetalleCategoria(id, mes) {
  const { data } = await api.get(`/api/reportes/categorias/${id}`, { params: { mes } });
  return data;
}
