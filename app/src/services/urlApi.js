// Expo reemplaza process.env.EXPO_PUBLIC_* al compilar: hay que leerla así, sin desestructurar.
export const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  console.warn('Falta EXPO_PUBLIC_API_URL en app/.env (mirá .env.example).');
}
