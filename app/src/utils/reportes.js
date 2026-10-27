import { router } from 'expo-router';
import { colores } from '@/theme';

// Así pide el back el detalle de los movimientos sin categoría.
const SIN_CATEGORIA = 'sin-categoria';

// ---------- meses como "2026-10" (el formato que usa el back) ----------

export function mesDeFecha(fecha) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

export const mesActual = () => mesDeFecha(new Date());

// "2026-10" → 1 de octubre de 2026, para formatearlo.
export function fechaDeMes(mes) {
  const [anio, numeroMes] = mes.split('-').map(Number);
  return new Date(anio, numeroMes - 1, 1);
}

// new Date ajusta solo el año: el mes 13 de 2026 es enero de 2027 y el -1, diciembre del anterior.
export function sumarMeses(mes, cantidad) {
  const fecha = fechaDeMes(mes);
  return mesDeFecha(new Date(fecha.getFullYear(), fecha.getMonth() + cantidad, 1));
}

// ---------- categorías (null = "Sin categoría") ----------

export const colorDeCategoria = (categoria) => categoria?.color ?? colores.sinCategoria;

export const nombreDeCategoria = (categoria) => categoria?.nombre ?? 'Sin categoría';

export const calcularPorcentaje = (parte, total) => (total > 0 ? (parte / total) * 100 : 0);

export function abrirDetalleCategoria(categoria, mes) {
  router.push({
    pathname: '/reportes/categoria',
    params: { id: categoria ? String(categoria.id) : SIN_CATEGORIA, mes },
  });
}
