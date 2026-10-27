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

// Tope "redondo" del eje Y para 2 tramos (0, mitad, tope): con 1.480.000 da 1.500.000 (0 · 750k · 1,5M).
// El tramo es el primer número "lindo" (1; 1,5; 2; 2,5; 3; 4; 5; 7,5 × 10^n) que alcanza la mitad del máximo.
const TRAMOS_REDONDOS = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10];

// Mínimo 1.000 (0 · 500 · 1k): con montos chicos las etiquetas redondeadas se repetirían.
export function calcularTopeEje(maximo) {
  if (maximo <= 1000) return 1000;
  const mitad = maximo / 2;
  const potencia = 10 ** Math.floor(Math.log10(mitad));
  const tramo = TRAMOS_REDONDOS.find((numero) => numero * potencia >= mitad) * potencia;
  return tramo * 2;
}

export function abrirDetalleCategoria(categoria, mes) {
  router.push({
    pathname: '/reportes/categoria',
    params: { id: categoria ? String(categoria.id) : SIN_CATEGORIA, mes },
  });
}
