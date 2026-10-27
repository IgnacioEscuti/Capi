import { categoriaRepository } from "../repositories/categoria.repository.js";
import { ICONO_GENERICO, PALETA_CATEGORIAS } from "../config/categoriasIniciales.js";
import { ErrorHttp } from "../utils/errorHttp.utils.js";

const PG_VIOLACION_UNIQUE = "23505";
const MENSAJE_NO_ENCONTRADA = "Categoría no encontrada";
const MENSAJE_DUPLICADA = "Ya tenés una categoría con ese nombre";

export class CategoriaService {
  constructor(repository) {
    this.repository = repository;
  }

  async listar(userId) {
    return this.repository.listarPorUsuario(userId);
  }

  async crear(userId, nombre) {
    const color = elegirColor(await this.repository.listarColores(userId));
    try {
      return await this.repository.crear(userId, { nombre: nombre.trim(), icono: ICONO_GENERICO, color });
    } catch (error) {
      throw traducirDuplicado(error);
    }
  }

  async renombrar(id, userId, nombre) {
    let categoria;
    try {
      categoria = await this.repository.renombrar(id, userId, nombre.trim());
    } catch (error) {
      throw traducirDuplicado(error);
    }
    // No existe o es de otro usuario: en los dos casos 404, para no revelar
    // que el id existe.
    if (!categoria) throw new ErrorHttp(404, MENSAJE_NO_ENCONTRADA);
    return categoria;
  }

  // Los movimientos de la categoría quedan "Sin categoría" por el
  // ON DELETE SET NULL de movements.category_id.
  async borrar(id, userId) {
    const borrada = await this.repository.borrar(id, userId);
    if (!borrada) throw new ErrorHttp(404, MENSAJE_NO_ENCONTRADA);
  }
}

// El color de la paleta que menos usan las categorías del usuario (en el orden de
// la paleta si hay empate): primero los libres y, si se terminaron, se repiten.
function elegirColor(enUso) {
  const usos = (color) => enUso.filter((usado) => usado === color).length;
  return PALETA_CATEGORIAS.reduce((elegido, color) => (usos(color) < usos(elegido) ? color : elegido));
}

// El UNIQUE (user_id, name) de la tabla es el que detecta el duplicado.
function traducirDuplicado(error) {
  return error.code === PG_VIOLACION_UNIQUE ? new ErrorHttp(409, MENSAJE_DUPLICADA) : error;
}

export const categoriaService = new CategoriaService(categoriaRepository);
