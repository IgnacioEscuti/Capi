import { router } from 'expo-router';

// Abre el formulario modal. Sin movimiento: crear. Con movimiento: editar.
// Los params de una ruta son siempre texto, por eso el movimiento viaja como JSON.
export function abrirFormularioMovimiento(movimiento) {
  if (!movimiento) return router.push('/movimiento');
  router.push({ pathname: '/movimiento', params: { movimiento: JSON.stringify(movimiento) } });
}
