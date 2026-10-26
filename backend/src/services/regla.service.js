import { reglaRepository } from "../repositories/regla.repository.js";
import { categoriaRepository } from "../repositories/categoria.repository.js";
import { ErrorHttp } from "../utils/errorHttp.utils.js";

const PG_VIOLACION_FOREIGN_KEY = "23503";
const MENSAJE_NO_ENCONTRADA = "Regla no encontrada";
const MENSAJE_CATEGORIA_INVALIDA = "La categoría elegida no existe";

// Las reglas se crean desde un movimiento (ver MovimientoService.actualizarConRegla).
export class ReglaService {
  constructor(repository, categoriaRepository) {
    this.repository = repository;
    this.categoriaRepository = categoriaRepository;
  }

  async listar(userId) {
    return this.repository.listarPorUsuario(userId);
  }

  // Solo nombre y categoría: la contraparte no se cambia.
  async actualizar(id, userId, { nombre, categoriaId }) {
    // La foreign key solo garantiza que la categoría exista, no de quién es.
    if (!(await this.categoriaRepository.existe(categoriaId, userId))) {
      throw new ErrorHttp(400, MENSAJE_CATEGORIA_INVALIDA);
    }

    let actualizada;
    try {
      actualizada = await this.repository.actualizar(id, userId, { nombre: nombre.trim(), categoriaId });
    } catch (error) {
      // La categoría se borró entre la verificación y el UPDATE.
      if (error.code === PG_VIOLACION_FOREIGN_KEY) throw new ErrorHttp(400, MENSAJE_CATEGORIA_INVALIDA);
      throw error;
    }
    // No existe o es de otro usuario: 404 en los dos casos.
    if (!actualizada) throw new ErrorHttp(404, MENSAJE_NO_ENCONTRADA);
    return this.repository.buscarPorId(id, userId);
  }

  // Los movimientos que ya entraron con la regla no cambian.
  async borrar(id, userId) {
    const borrada = await this.repository.borrar(id, userId);
    if (!borrada) throw new ErrorHttp(404, MENSAJE_NO_ENCONTRADA);
  }
}

export const reglaService = new ReglaService(reglaRepository, categoriaRepository);
