import { api } from './api';

export async function listarMovimientos() {
  const { data } = await api.get('/api/movimientos');
  return data.movimientos;
}

// datos: { tipo, monto, fecha, descripcion, categoriaId }
export async function crearMovimiento(datos) {
  const { data } = await api.post('/api/movimientos', datos);
  return data.movimiento;
}

export async function actualizarMovimiento(id, datos) {
  const { data } = await api.put(`/api/movimientos/${id}`, datos);
  return data.movimiento;
}

export async function borrarMovimiento(id) {
  await api.delete(`/api/movimientos/${id}`);
}
