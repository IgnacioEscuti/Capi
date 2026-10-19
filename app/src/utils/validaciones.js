// Mismas reglas que backend/src/middlewares/validacion.middlewares.js
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_CARACTERES = 8;
const PASSWORD_MAX_CARACTERES = 72;

const estaVacio = (valor) => valor.trim() === '';

function validarEmail(email) {
  if (estaVacio(email)) return 'Ingresá tu email.';
  if (!EMAIL_REGEX.test(email.trim())) return 'El email no tiene un formato válido.';
}

export function validarLogin({ email, password }) {
  const errores = {};
  const errorEmail = validarEmail(email);
  if (errorEmail) errores.email = errorEmail;
  if (estaVacio(password)) errores.password = 'Ingresá tu contraseña.';
  return errores;
}

export function validarRegistro({ nombre, email, password }) {
  const errores = {};
  if (estaVacio(nombre)) errores.nombre = 'Ingresá tu nombre.';

  const errorEmail = validarEmail(email);
  if (errorEmail) errores.email = errorEmail;

  if (estaVacio(password)) {
    errores.password = 'Ingresá una contraseña.';
  } else if (password.length < PASSWORD_MIN_CARACTERES) {
    errores.password = `La contraseña debe tener al menos ${PASSWORD_MIN_CARACTERES} caracteres.`;
  } else if (password.length > PASSWORD_MAX_CARACTERES) {
    errores.password = `La contraseña puede tener como máximo ${PASSWORD_MAX_CARACTERES} caracteres.`;
  }
  return errores;
}

// Mismos límites que el back para movimientos y categorías.
const DESCRIPCION_MAX_CARACTERES = 200;
const NOMBRE_CATEGORIA_MAX_CARACTERES = 40;

export function validarMovimiento({ monto, descripcion }) {
  const errores = {};
  if (!(monto > 0)) errores.monto = 'Ingresá un monto mayor a 0.';
  if (descripcion.trim().length > DESCRIPCION_MAX_CARACTERES) {
    errores.descripcion = `La descripción puede tener como máximo ${DESCRIPCION_MAX_CARACTERES} caracteres.`;
  }
  return errores;
}

export function validarNombreCategoria(nombre) {
  if (estaVacio(nombre)) return 'Ingresá un nombre.';
  if (nombre.trim().length > NOMBRE_CATEGORIA_MAX_CARACTERES) {
    return `El nombre puede tener como máximo ${NOMBRE_CATEGORIA_MAX_CARACTERES} caracteres.`;
  }
}

export const tieneErrores =(errores) => Object.keys(errores).length > 0;
