import { api } from './api';

// mes: "2026-10". Devuelve { mes, cantidadMovimientos, totalGastado, categorias: [{ categoria, total, cantidad }] }
// (categoria null = "Sin categoría").
export async function obtenerGastosPorCategoria(mes) {
  const { data } = await api.get('/api/reportes/categorias', { params: { mes } });
  return data;
}

// Devuelve { mes, ingresos, egresos, ahorro, tasaAhorro (% o null), comparacion: { tipo: 'mismo_dia' |
// 'mes_anterior', egresosAnteriores, variacion (% o null) }, gastoPromedioDiario, meses: [6 × { mes, ingresos, egresos }] }.
export async function obtenerResumenMes(mes) {
  const { data } = await api.get('/api/reportes/resumen', { params: { mes } });
  return data;
}

// Devuelve { mes, tieneReglas, transferidos: [{ id, nombre, monto }], recibidos: [...] } (top 5 de cada uno;
// id y nombre son los de la regla).
export async function obtenerPersonasMes(mes) {
  const { data } = await api.get('/api/reportes/personas', { params: { mes } });
  return data;
}

// Todo lo de la pantalla Reportes para un mes, pedido en paralelo: { mes, gastos, resumen, personas }.
export async function obtenerReporteDelMes(mes) {
  const [gastos, resumen, personas] = await Promise.all([
    obtenerGastosPorCategoria(mes),
    obtenerResumenMes(mes),
    obtenerPersonasMes(mes),
  ]);
  return { mes, gastos, resumen, personas };
}

// id: el de la categoría o "sin-categoria". Devuelve { mes, categoria, total, cantidad, totalGastado,
// meses: [{ mes, total }] (los 12 que terminan en "mes"), movimientos }.
export async function obtenerDetalleCategoria(id, mes) {
  const { data } = await api.get(`/api/reportes/categorias/${id}`, { params: { mes } });
  return data;
}
