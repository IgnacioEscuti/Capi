import { movimientoRepository } from "../repositories/movimiento.repository.js";
import { categoriaRepository } from "../repositories/categoria.repository.js";
import { ErrorHttp } from "../utils/errorHttp.utils.js";

const PG_VIOLACION_FOREIGN_KEY = "23503";
const CANTIDAD_ULTIMOS = 5;
const MENSAJE_NO_ENCONTRADO = "Movimiento no encontrado";
const MENSAJE_CATEGORIA_INVALIDA = "La categoría elegida no existe";

export class MovimientoService {
  constructor(repository, categoriaRepository) {
    this.repository = repository;
    this.categoriaRepository = categoriaRepository;
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
    const movimiento = await this.prepararDatos(userId, datos);
    const actualizado = await this.guardarConCategoria(() => this.repository.actualizar(id, userId, movimiento));
    if (!actualizado) throw new ErrorHttp(404, MENSAJE_NO_ENCONTRADO);
    return this.repository.buscarPorId(id, userId);
  }

  async borrar(id, userId) {
    const borrado = await this.repository.borrar(id, userId);
    if (!borrado) throw new ErrorHttp(404, MENSAJE_NO_ENCONTRADO);
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

export const movimientoService = new MovimientoService(movimientoRepository, categoriaRepository);
