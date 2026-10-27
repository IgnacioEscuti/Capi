export const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

// Mes actual en hora argentina, como "2026-10". El servidor (Vercel) corre en UTC:
// el 31 a las 22 h de Argentina ya es el 1 del mes siguiente en UTC.
export function mesActual() {
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: ZONA_HORARIA, year: "numeric", month: "2-digit" })
    .formatToParts(new Date());
  const valor = (tipo) => partes.find((parte) => parte.type === tipo).value;
  return `${valor("year")}-${valor("month")}`;
}
