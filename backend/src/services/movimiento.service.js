import { movimientoRepository } from "../repositories/movimiento.repository.js";
import { categoriaRepository } from "../repositories/categoria.repository.js";
import { reglaRepository } from "../repositories/regla.repository.js";
import { enTransaccion } from "../config/database.js";
import { ErrorHttp } from "../utils/errorHttp.utils.js";

const PG_VIOLACION_FOREIGN_KEY = "23503";
const PG_VIOLACION_UNIQUE = "23505";
const CANTIDAD_ULTIMOS = 5;
const MENSAJE_NO_ENCONTRADO = "Movimiento no encontrado";
const MENSAJE_CATEGORIA_INVALIDA = "La categoría elegida no existe";
const MENSAJE_TIPO_MANUAL = "El tipo debe ser 'income' o 'expense'";
const MENSAJE_MP_SOLO_DESCRIPCION_Y_CATEGORIA =
  "En los movimientos de Mercado Pago solo se pueden cambiar la descripción y la categoría";
const MENSAJE_MP_NO_SE_BORRA = "Los movimientos de Mercado Pago no se pueden borrar";
const MENSAJE_REGLA_SIN_CONTRAPARTE =
  "Solo se pueden crear reglas desde movimientos de Mercado Pago con una persona o un CBU";
const MENSAJE_REGLA_SIN_CATEGORIA = "Elegí una categoría para crear la regla";
const MENSAJE_REGLA_DUPLICADA = "Ya tenés una regla para esta persona";

const ORIGEN_MP = "mp_api";

// Tipo, monto y fecha de un movimiento de MP vienen de MP: el PUT tiene que
// mandarlos iguales a los guardados.
function cambiaDatosDeMp(guardado, { tipo, monto, fecha }) {
  return (
    tipo !== guardado.type ||
    monto !== Number(guardado.amount) ||
    new Date(fecha).getTime() !== guardado.occurred_at.getTime()
  );
}

export class MovimientoService {
  constructor(repository, categoriaRepository, reglaRepository) {
    this.repository = repository;
    this.categoriaRepository = categoriaRepository;
    this.reglaRepository = reglaRepository;
  }

  async listar(userId) {
    return this.repository.listarPorUsuario(userId);
  }

  async crear(userId, datos) {
    const movimiento = await this.prepararDatos(userId, datos);
    const id = await this.guardarConCategoria(() => this.repository.crear(userId, movimiento));
    return this.repository.buscarPorId(id, userId);
  }

  async actualizar(id, userId, datos) {
    const guardado = await this.buscarDelUsuario(id, userId);
    const esDeMp = guardado.source === ORIGEN_MP;

    if (esDeMp && cambiaDatosDeMp(guardado, datos)) {
      throw new ErrorHttp(400, MENSAJE_MP_SOLO_DESCRIPCION_Y_CATEGORIA);
    }
    // 'internal' solo existe en movimientos importados de MP.
    if (!esDeMp && datos.tipo === "internal") throw new ErrorHttp(400, MENSAJE_TIPO_MANUAL);

    const movimiento = await this.prepararDatos(userId, datos);
    if (datos.regla) return this.actualizarConRegla(guardado, userId, movimiento, datos.regla.nombre.trim());

    const actualizado = await this.guardarConCategoria(() =>
      esDeMp
        ? this.repository.actualizarDescripcionYCategoria(id, userId, movimiento)
        : this.repository.actualizar(id, userId, movimiento)
    );
    if (!actualizado) throw new ErrorHttp(404, MENSAJE_NO_ENCONTRADO);
    return this.repository.buscarPorId(id, userId);
  }

  // Guarda el movimiento de MP y crea la regla para su contraparte, todo en
  // una transacción: si falla cualquiera de los dos, no queda nada guardado.
  // Si la descripción quedó vacía, el movimiento toma el nombre de la regla.
  async actualizarConRegla(guardado, userId, movimiento, nombre) {
    const tieneContraparte = guardado.counterparty_mp_id != null || guardado.counterparty_account_hash != null;
    if (guardado.source !== ORIGEN_MP || !tieneContraparte) throw new ErrorHttp(400, MENSAJE_REGLA_SIN_CONTRAPARTE);
    if (movimiento.categoriaId === null) throw new ErrorHttp(400, MENSAJE_REGLA_SIN_CATEGORIA);

    try {
      await this.guardarConCategoria(() =>
        enTransaccion(async (client) => {
          await this.repository.actualizarDescripcionYCategoria(
            guardado.id,
            userId,
            { descripcion: movimiento.descripcion ?? nombre, categoriaId: movimiento.categoriaId },
            client
          );
          await this.reglaRepository.crear(
            userId,
            {
              contraparteMpId: guardado.counterparty_mp_id,
              cuentaHash: guardado.counterparty_account_hash,
              cuentaUltimos4: guardado.counterparty_account_last4,
              nombre,
              categoriaId: movimiento.categoriaId,
            },
            client
          );
        })
      );
    } catch (error) {
      // El UNIQUE (user_id, contraparte) de rules es el que detecta la regla repetida.
      if (error.code === PG_VIOLACION_UNIQUE) throw new ErrorHttp(409, MENSAJE_REGLA_DUPLICADA);
      throw error;
    }
    return this.repository.buscarPorId(guardado.id, userId);
  }

  async borrar(id, userId) {
    const guardado = await this.buscarDelUsuario(id, userId);
    if (guardado.source === ORIGEN_MP) throw new ErrorHttp(409, MENSAJE_MP_NO_SE_BORRA);

    const borrado = await this.repository.borrar(id, userId);
    if (!borrado) throw new ErrorHttp(404, MENSAJE_NO_ENCONTRADO);
  }

  // No existe o es de otro usuario: 404 en los dos casos.
  async buscarDelUsuario(id, userId) {
    const movimiento = await this.repository.buscarPorId(id, userId);
    if (!movimiento) throw new ErrorHttp(404, MENSAJE_NO_ENCONTRADO);
    return movimiento;
  }

  async inicio(userId) {
    const [resumen, ultimos] = await Promise.all([
      this.repository.resumen(userId),
      this.repository.listarPorUsuario(userId, CANTIDAD_ULTIMOS),
    ]);
    return { resumen, ultimos };
  }

  // Normaliza los datos (ya validados por el middleware) y verifica que la
  // categoría sea del usuario: la foreign key solo garantiza que exista,
  // no de quién es.
  async prepararDatos(userId, { tipo, monto, fecha, descripcion, categoriaId }) {
    const categoria = categoriaId ?? null;
    if (categoria !== null && !(await this.categoriaRepository.existe(categoria, userId))) {
      throw new ErrorHttp(400, MENSAJE_CATEGORIA_INVALIDA);
    }

    return {
      tipo,
      monto,
      fecha,
      descripcion: descripcion?.trim() || null,
      categoriaId: categoria,
    };
  }

  // Si la categoría se borra entre la verificación y el INSERT/UPDATE, la
  // foreign key falla: se responde 400 en vez de un 500.
  async guardarConCategoria(guardar) {
    try {
      return await guardar();
    } catch (error) {
      if (error.code === PG_VIOLACION_FOREIGN_KEY) throw new ErrorHttp(400, MENSAJE_CATEGORIA_INVALIDA);
      throw error;
    }
  }
}

export const movimientoService = new MovimientoService(movimientoRepository, categoriaRepository, reglaRepository);
