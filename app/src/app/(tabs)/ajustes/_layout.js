import { Stack } from 'expo-router';

// PROVISORIO-WEB: si la PWA abre directo una pantalla de Ajustes (al volver de conectar MP
// o al recargar la página), Ajustes queda debajo y "Volver" tiene a dónde ir.
export const unstable_settings = { initialRouteName: 'index' };

// Stack propio dentro de la pestaña Ajustes: Categorías se abre encima de
// Ajustes sin salir de la pestaña, así el navbar sigue visible.
export default function AjustesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
