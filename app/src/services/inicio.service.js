import { api } from './api';

// { saldo, esteMes: { ingresos, egresos }, ultimos: [movimientos] }
export async function obtenerInicio() {
  const { data } = await api.get('/api/inicio');
  return data;
}
