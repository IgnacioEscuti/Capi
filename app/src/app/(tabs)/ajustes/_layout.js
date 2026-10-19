import { Stack } from 'expo-router';

// Stack propio dentro de la pestaña Ajustes: Categorías se abre encima de
// Ajustes sin salir de la pestaña, así el navbar sigue visible.
export default function AjustesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
