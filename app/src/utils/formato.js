const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MENOS = '−';

// "1234567" → "1.234.567"
export function agruparMiles(entero) {
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// A mano y no con toLocaleString('es-AR'): el locale español no agrupa
// números de 4 cifras (daría "3200" en vez de "3.200").
export function formatearNumero(valor, decimales = 2) {
  const [entero, centavos] = Math.abs(valor).toFixed(decimales).split('.');
  const enteroConPuntos = agruparMiles(entero);
  return centavos ? `${enteroConPuntos},${centavos}` : enteroConPuntos;
}

export function formatearPesos(valor, { decimalesOpcionales = false } = {}) {
  const decimales = decimalesOpcionales && Number.isInteger(valor) ? 0 : 2;
  const signo = valor < 0 ? MENOS : '';
  return `${signo}$ ${formatearNumero(valor, decimales)}`;
}

export function formatearPesosConSigno(valor) {
  const signo = valor < 0 ? MENOS : '+';
  return `${signo} $ ${formatearNumero(valor)}`;
}

// ---------- fechas (siempre con la hora del teléfono) ----------

export function esMismoDia(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function esHoy(fecha) {
  return esMismoDia(fecha, new Date());
}

function esAyer(fecha) {
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  return esMismoDia(fecha, ayer);
}

const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

// "19 oct", o "19 oct 2025" si no es de este año.
export function formatearFechaCorta(fecha) {
  const texto = `${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]}`;
  return fecha.getFullYear() === new Date().getFullYear() ? texto : `${texto} ${fecha.getFullYear()}`;
}

// Para las filas de movimientos: "Hoy", "Ayer" o "17 oct".
export function formatearFechaMovimiento(fecha) {
  if (esHoy(fecha)) return 'Hoy';
  if (esAyer(fecha)) return 'Ayer';
  return formatearFechaCorta(fecha);
}

// Para el formulario: "Hoy, lunes 19 oct", "Ayer, domingo 18 oct" o "Sábado 17 oct".
export function formatearFechaLarga(fecha) {
  const texto = `${DIAS[fecha.getDay()]} ${formatearFechaCorta(fecha)}`;
  if (esHoy(fecha)) return `Hoy, ${texto}`;
  if (esAyer(fecha)) return `Ayer, ${texto}`;
  return capitalizar(texto);
}

// "09:05"
export function formatearHora(fecha) {
  const dosCifras = (numero) => String(numero).padStart(2, '0');
  return `${dosCifras(fecha.getHours())}:${dosCifras(fecha.getMinutes())}`;
}

// Para "Última sincronización: …": "hoy 12:45", "ayer 18:02" o "17 oct 09:30".
export function formatearMomento(fecha) {
  const dia = esHoy(fecha) ? 'hoy' : esAyer(fecha) ? 'ayer' : formatearFechaCorta(fecha);
  return `${dia} ${formatearHora(fecha)}`;
}

// "Octubre 2026"
export function formatearMesAnio(fecha) {
  return `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

// ---------- usuario ----------

export function obtenerPrimerNombre(nombre) {
  return nombre.trim().split(/\s+/)[0];
}

export function obtenerIniciales(nombre) {
  const palabras = nombre.trim().split(/\s+/);
  const primera = palabras[0][0];
  const ultima = palabras.length > 1 ? palabras[palabras.length - 1][0] : '';
  return `${primera}${ultima}`.toUpperCase();
}
