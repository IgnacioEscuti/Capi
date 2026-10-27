export const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

// Hoy en hora argentina: { mes: "2026-10", dia: 27 }. El servidor (Vercel) corre en UTC:
// el 31 a las 22 h de Argentina ya es el 1 del mes siguiente en UTC.
export function hoyEnArgentina() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const valor = (tipo) => partes.find((parte) => parte.type === tipo).value;
  return { mes: `${valor("year")}-${valor("month")}`, dia: Number(valor("day")) };
}

// Mes actual en hora argentina, como "2026-10".
export const mesActual = () => hoyEnArgentina().mes;

// "2026-10" → 31. El día 0 del mes siguiente es el último del mes (Date.UTC acepta el mes 12 como enero).
export function diasDelMes(mes) {
  const [anio, numeroMes] = mes.split("-").map(Number);
  return new Date(Date.UTC(anio, numeroMes, 0)).getUTCDate();
}

// "2026-01" → "2025-12".
export function mesAnterior(mes) {
  const [anio, numeroMes] = mes.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, numeroMes - 2, 1));
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
}
