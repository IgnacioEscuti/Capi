import { env } from "../config/env.js";
import { ErrorHttp } from "../utils/errorHttp.utils.js";
import { mesActual } from "../utils/fecha.utils.js";

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
// Al editar se acepta también 'internal' (reservas de MP): la app reenvía el
// tipo tal cual. El service se encarga de que no se cambie ni se use en uno manual.
const TIPOS_MOVIMIENTO_EDICION = [...TIPOS_MOVIMIENTO, "internal"];
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

const crearValidadorMovimiento = (tiposPermitidos) => (req, res, next) => {
  const { tipo, monto, fecha, descripcion, categoriaId } = req.body ?? {};

  if (!tiposPermitidos.includes(tipo)) {
    return next(new ErrorHttp(400, `El tipo debe ser ${tiposPermitidos.map((t) => `'${t}'`).join(" o ")}`));
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
};

export const validarMovimiento = crearValidadorMovimiento(TIPOS_MOVIMIENTO);
export const validarEdicionMovimiento = crearValidadorMovimiento(TIPOS_MOVIMIENTO_EDICION);

// ---------- reglas ----------

// El nombre de la regla pasa a ser la descripción de los movimientos.
const NOMBRE_REGLA_MAX_CARACTERES = 40;

function errorNombreRegla(nombre) {
  if (!esTextoConContenido(nombre)) return "El nombre de la regla es obligatorio";
  if (nombre.trim().length > NOMBRE_REGLA_MAX_CARACTERES) {
    return `El nombre de la regla puede tener como máximo ${NOMBRE_REGLA_MAX_CARACTERES} caracteres`;
  }
  return null;
}

// "regla" es opcional en el PUT de movimientos: { nombre } crea una regla para
// la contraparte del movimiento. Lo demás (que sea de MP, que tenga contraparte
// y categoría) lo verifica el service, que tiene el movimiento guardado.
export function validarReglaDeMovimiento(req, res, next) {
  const { regla } = req.body ?? {};
  if (regla == null) return next();

  if (typeof regla !== "object" || Array.isArray(regla)) {
    return next(new ErrorHttp(400, "La regla debe ser un objeto { nombre }"));
  }
  const error = errorNombreRegla(regla.nombre);
  if (error) return next(new ErrorHttp(400, error));

  next();
}

export function validarRegla(req, res, next) {
  const { nombre, categoriaId } = req.body ?? {};

  const error = errorNombreRegla(nombre);
  if (error) return next(new ErrorHttp(400, error));
  if (!esIdValido(categoriaId)) return next(new ErrorHttp(400, "La categoría elegida no existe"));

  next();
}

// ---------- reportes ----------

// "2026-10": años 2000 a 2099 y meses 01 a 12.
const MES_REGEX = /^20\d{2}-(0[1-9]|1[0-2])$/;
export const SIN_CATEGORIA = "sin-categoria";

// Se comparan como texto: con el formato "AAAA-MM", el orden alfabético es el cronológico.
export function validarMesReporte(req, res, next) {
  const { mes } = req.query;
  if (typeof mes !== "string" || !MES_REGEX.test(mes)) {
    return next(new ErrorHttp(400, "El mes debe tener el formato AAAA-MM"));
  }
  if (mes > mesActual()) return next(new ErrorHttp(400, "El mes no puede ser futuro"));
  next();
}

// El detalle de "Sin categoría" va por /categorias/sin-categoria; otro id mal formado → 404.
export function validarCategoriaReporte(req, res, next) {
  if (req.params.id === SIN_CATEGORIA) return next();
  validarIdParam(req, res, next);
}

// ---------- Mercado Pago ----------

// Solo se vuelve a la app: exp:// (Expo Go, desarrollo) o capi:// (app instalada).
// Cualquier otra cosa se rechaza para que el callback no sirva de "open
// redirect" (mandar al usuario a un sitio ajeno con apariencia de Capi).
const ESQUEMAS_RETORNO = ["exp:", "capi:"];
const RETURN_URL_MAX_CARACTERES = 500;

// PROVISORIO-WEB: la PWA vuelve a una URL https. Se acepta solo esta, comparada
// exacta (sin query ni rutas extra), y solo si WEB_URL está configurada.
const RETURN_URL_WEB = env.WEB_URL ? `${env.WEB_URL.replace(/\/+$/, "")}/ajustes/mercado-pago` : null;

function esReturnUrlValida(valor) {
  if (typeof valor !== "string" || valor.length > RETURN_URL_MAX_CARACTERES) return false;
  if (RETURN_URL_WEB && valor === RETURN_URL_WEB) return true; // PROVISORIO-WEB
  try {
    return ESQUEMAS_RETORNO.includes(new URL(valor).protocol);
  } catch {
    return false;
  }
}

export function validarReturnUrl(req, res, next) {
  if (!esReturnUrlValida(req.query.returnUrl)) {
    return next(new ErrorHttp(400, "returnUrl tiene que ser una URL de la app (exp:// o capi://)"));
  }
  next();
}
