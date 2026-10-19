import { esMismoDia, formatearMesAnio } from './formato';

export const NOMBRE_TIPO = { income: 'Ingreso', expense: 'Egreso' };

// Sin descripción: el nombre de la categoría o, si tampoco hay, "Ingreso"/"Egreso".
export function obtenerTituloMovimiento({ descripcion, categoria, tipo }) {
  return descripcion || categoria?.nombre || NOMBRE_TIPO[tipo];
}

// El back guarda el monto siempre positivo: el signo lo da el tipo.
export function obtenerMontoConSigno({ tipo, monto }) {
  return tipo === 'income' ? monto : -monto;
}

// Los movimientos llegan del más nuevo al más viejo, así que alcanza con ir
// cortando cada vez que cambia el mes.
export function agruparPorMes(movimientos) {
  const grupos = [];
  for (const movimiento of movimientos) {
    const fecha = new Date(movimiento.fecha);
    const clave = `${fecha.getFullYear()}-${fecha.getMonth()}`;
    const ultimo = grupos[grupos.length - 1];

    if (ultimo?.clave === clave) {
      ultimo.movimientos.push(movimiento);
    } else {
      grupos.push({ clave, titulo: formatearMesAnio(fecha), movimientos: [movimiento] });
    }
  }
  return grupos;
}

function conDiaDe(dia, hora) {
  const fecha = new Date(hora);
  fecha.setFullYear(dia.getFullYear(), dia.getMonth(), dia.getDate());
  return fecha;
}

// Fecha que se manda al back (ISO en UTC, con la "Z" como zona):
// - Nuevo: el día elegido + la hora actual.
// - Editando: si el día no cambió se conserva el instante original; si cambió, día nuevo + hora original.
export function calcularFechaAEnviar(diaElegido, fechaOriginal) {
  if (!fechaOriginal) return conDiaDe(diaElegido, new Date()).toISOString();

  const original = new Date(fechaOriginal);
  if (esMismoDia(diaElegido, original)) return fechaOriginal;
  return conDiaDe(diaElegido, original).toISOString();
}

// ---------- monto mientras se escribe ----------

const MONTO_MAX_CIFRAS_ENTERAS = 12;

// Deja el texto del monto en la forma "12500,5": solo dígitos y una coma, sin
// ceros a la izquierda, hasta 12 cifras enteras y 2 decimales (lo que acepta el back).
// El teclado decimal-pad puede traer punto o coma según la región del teléfono.
export function limpiarMonto(texto) {
  const [entero = '', ...resto] = texto.replace(/\./g, ',').replace(/[^\d,]/g, '').split(',');
  const enteroLimpio = entero.replace(/^0+(?=\d)/, '').slice(0, MONTO_MAX_CIFRAS_ENTERAS);
  if (resto.length === 0) return enteroLimpio;
  return `${enteroLimpio || '0'},${resto.join('').slice(0, 2)}`;
}

export const montoANumero = (texto) => Number(texto.replace(',', '.')) || 0;

export const numeroAMonto = (numero) => String(numero).replace('.', ',');
