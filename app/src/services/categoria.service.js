import { api } from './api';

export async function listarCategorias() {
  const { data } = await api.get('/api/categorias');
  return data.categorias;
}

export async function crearCategoria(nombre) {
  const { data } = await api.post('/api/categorias', { nombre });
  return data.categoria;
}

export async function renombrarCategoria(id, nombre) {
  const { data } = await api.patch(`/api/categorias/${id}`, { nombre });
  return data.categoria;
}

export async function borrarCategoria(id) {
  await api.delete(`/api/categorias/${id}`);
}
