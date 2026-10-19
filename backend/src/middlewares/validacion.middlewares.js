import { ErrorHttp } from "../utils/errorHttp.utils.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_CARACTERES = 8;
const PASSWORD_MAX_CARACTERES = 72;

const esTextoConContenido = (valor) => typeof valor === "string" && valor.trim() !== "";

export function validarRegistro(req, res, next) {
  const { name, email, password } = req.body ?? {};

  if (!esTextoConContenido(name) || !esTextoConContenido(email) || !esTextoConContenido(password)) {
    return next(new ErrorHttp(400, "Nombre, email y contraseña son obligatorios"));
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return next(new ErrorHttp(400, "El email no tiene un formato válido"));
  }
  if (password.length < PASSWORD_MIN_CARACTERES) {
    return next(new ErrorHttp(400, `La contraseña debe tener al menos ${PASSWORD_MIN_CARACTERES} caracteres`));
  }
  if (password.length > PASSWORD_MAX_CARACTERES) {
    return next(new ErrorHttp(400, `La contraseña puede tener como máximo ${PASSWORD_MAX_CARACTERES} caracteres`));
  }

  next();
}

export function validarLogin(req, res, next) {
  const { email, password } = req.body ?? {};

  if (!esTextoConContenido(email) || !esTextoConContenido(password)) {
    return next(new ErrorHttp(400, "Email y contraseña son obligatorios"));
  }

  next();
}

// ---------- ids ----------

// Máximo de una columna INTEGER de Postgres: un id más grande haría fallar
// la consulta con un error 500 en vez de un 404.
const ID_MAXIMO = 2147483647;

const esIdValido = (valor) => Number.isInteger(valor) && valor > 0 && valor <= ID_MAXIMO;

// Un id mal formado se trata igual que uno que no existe.
export function validarIdParam(req, res, next) {
  const { id } = req.params;
  if (!/^\d+$/.test(id) || !esIdValido(Number(id))) {
    return next(new ErrorHttp(404, "Recurso no encontrado"));
  }
  next();
}

// ---------- categorías ----------

const NOMBRE_CATEGORIA_MAX_CARACTERES = 40;

export function validarCategoria(req, res, next) {
  const { nombre } = req.body ?? {};

  if (!esTextoConContenido(nombre)) {
    return next(new ErrorHttp(400, "El nombre de la categoría es obligatorio"));
  }
  if (nombre.trim().length > NOMBRE_CATEGORIA_MAX_CARACTERES) {
    return next(new ErrorHttp(400, `El nombre puede tener como máximo ${NOMBRE_CATEGORIA_MAX_CARACTERES} caracteres`));
  }

  next();
}

// ---------- movimientos ----------

const TIPOS_MOVIMIENTO = ["income", "expense"];
const DESCRIPCION_MAX_CARACTERES = 200;

// Hasta 12 dígitos enteros y 2 decimales: lo que entra en NUMERIC(14,2).
// Se valida sobre el texto del número para no depender de cuentas con
// decimales (que en JS no son exactas). Números como 1e-7 o 1e21 no pasan.
const MONTO_REGEX = /^\d{1,12}(\.\d{1,2})?$/;

// ISO 8601 con hora y zona horaria obligatoria (Z o ±hh:mm),
// por ejemplo "2026-10-19T14:30:00.000Z" o "2026-10-19T11:30:00-03:00".
const FECHA_ISO_REGEX = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

const esMontoValido = (monto) => typeof monto === "number" && monto > 0 && MONTO_REGEX.test(String(monto));

// JS acepta fechas como el 30 de febrero (las pasa al 2 de marzo) y Postgres
// no: se verifica que el día exista armando la fecha y comparando.
function esFechaValida(fecha) {
  const partes = typeof fecha === "string" ? fecha.match(FECHA_ISO_REGEX) : null;
  if (!partes) return false;

  const [, anio, mes, dia] = partes.map(Number);
  const calendario = new Date(Date.UTC(anio, mes - 1, dia));
  return calendario.getUTCFullYear() === anio && calendario.getUTCMonth() === mes - 1 && calendario.getUTCDate() === dia;
}

export function validarMovimiento(req, res, next) {
  const { tipo, monto, fecha, descripcion, categoriaId } = req.body ?? {};

  if (!TIPOS_MOVIMIENTO.includes(tipo)) {
    return next(new ErrorHttp(400, "El tipo debe ser 'income' o 'expense'"));
  }
  if (!esMontoValido(monto)) {
    return next(new ErrorHttp(400, "El monto debe ser un número mayor a 0, con hasta 2 decimales y 12 cifras enteras"));
  }
  if (!esFechaValida(fecha)) {
    return next(new ErrorHttp(400, "La fecha debe estar en formato ISO 8601 con zona horaria"));
  }
  if (descripcion != null && typeof descripcion !== "string") {
    return next(new ErrorHttp(400, "La descripción debe ser texto"));
  }
  if (descripcion != null && descripcion.trim().length > DESCRIPCION_MAX_CARACTERES) {
    return next(new ErrorHttp(400, `La descripción puede tener como máximo ${DESCRIPCION_MAX_CARACTERES} caracteres`));
  }
  if (categoriaId != null && !esIdValido(categoriaId)) {
    return next(new ErrorHttp(400, "La categoría elegida no existe"));
  }

  next();
}
