import { router } from 'expo-router';

// De dónde viene la persona de la regla: "Mercado Pago" o "CBU …1234".
export const textoOrigen = (regla) => (regla.origen === 'mp' ? 'Mercado Pago' : `CBU …${regla.ultimos4}`);

// Abre Editar regla (modal). Viaja solo el id: la pantalla trae la regla
// actualizada, porque desde un movimiento no se conoce su origen.
export function abrirEditarRegla(id) {
  router.push({ pathname: '/regla', params: { id: String(id) } });
}
