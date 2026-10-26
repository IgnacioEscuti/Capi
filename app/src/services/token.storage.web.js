// PROVISORIO-WEB: en el navegador no hay expo-secure-store, el token va a localStorage.
// Es solo el JWT de Capi; los tokens de Mercado Pago nunca salen del back.
// Mismas funciones (y async) que token.storage.js, así el resto de la app no cambia.
const CLAVE_TOKEN = 'token_sesion';

export const obtenerToken = async () => localStorage.getItem(CLAVE_TOKEN);
export const guardarToken = async (token) => localStorage.setItem(CLAVE_TOKEN, token);
export const borrarToken = async () => localStorage.removeItem(CLAVE_TOKEN);
