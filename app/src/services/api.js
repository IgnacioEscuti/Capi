import axios from 'axios';
import { obtenerToken } from './token.storage';
import { API_URL } from './urlApi';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await obtenerToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function obtenerMensajeDeError(error) {
  if (error.response) return error.response.data?.error ?? 'Ocurrió un error inesperado.';
  return 'No se pudo conectar con el servidor. Revisá tu conexión.';
}
