import { Stack } from 'expo-router';

// PROVISORIO-WEB: si la PWA abre directo el detalle de una categoría (al recargar la página),
// Reportes queda debajo y "Volver" tiene a dónde ir.
export const unstable_settings = { initialRouteName: 'index' };

// Stack propio dentro de la pestaña Reportes (como Ajustes): el detalle de una
// categoría se abre encima sin salir de la pestaña, así el navbar sigue visible.
export default function ReportesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
