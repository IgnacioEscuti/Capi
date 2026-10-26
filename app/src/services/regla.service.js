import { api } from './api';

// Las reglas se crean desde el PUT de un movimiento de MP (campo "regla": { nombre }).
export async function listarReglas() {
  const { data } = await api.get('/api/reglas');
  return data.reglas;
}

// datos: { nombre, categoriaId }
export async function actualizarRegla(id, datos) {
  const { data } = await api.put(`/api/reglas/${id}`, datos);
  return data.regla;
}

export async function borrarRegla(id) {
  await api.delete(`/api/reglas/${id}`);
}
