import { usuarioRepository } from "../repositories/usuario.repository.js";
import { categoriaRepository } from "../repositories/categoria.repository.js";
import { enTransaccion } from "../config/database.js";
import { CATEGORIAS_INICIALES } from "../config/categoriasIniciales.js";
import { crearHash, esPasswordValida } from "../utils/hash.utils.js";
import { generarToken } from "../utils/jwt.utils.js";
import { normalizarEmail } from "../utils/email.utils.js";
import { ErrorHttp } from "../utils/errorHttp.utils.js";

const MAX_INTENTOS_FALLIDOS = 10;
const MINUTOS_BLOQUEO = 2;
const PG_VIOLACION_UNIQUE = "23505";

export class UsuarioService {
  constructor(repository, categoriaRepository) {
    this.repository = repository;
    this.categoriaRepository = categoriaRepository;
  }

  async registrar({ nombre, email, password }) {
    const emailNormalizado = normalizarEmail(email);

    const existente = await this.repository.buscarPorEmail(emailNormalizado);
    if (existente) throw new ErrorHttp(409, "El email ya está registrado");

    const passwordHash = await crearHash(password);

    try {
      // Usuario y categorías iniciales van juntos: si falla cualquiera de
      // los dos INSERT, el ROLLBACK deshace todo y no queda nada a medias.
      return await enTransaccion(async (client) => {
        const usuario = await this.repository.crear(
          { nombre: nombre.trim(), email: emailNormalizado, passwordHash },
          client
        );
        await this.categoriaRepository.crearVarias(usuario.id, CATEGORIAS_INICIALES, client);
        return usuario;
      });
    } catch (error) {
      // Dos registros simultáneos con el mismo email pueden pasar el chequeo
      // de arriba a la vez: el UNIQUE de la tabla es el que decide.
      if (error.code === PG_VIOLACION_UNIQUE) {
        throw new ErrorHttp(409, "El email ya está registrado");
      }
      throw error;
    }
  }

  async login(email, password) {
    const usuario = await this.repository.buscarPorEmail(normalizarEmail(email));
    if (!usuario) throw new ErrorHttp(401, "Credenciales inválidas");

    const ahora = new Date();
    if (usuario.locked_until && usuario.locked_until > ahora) {
      const minutosRestantes = Math.ceil((usuario.locked_until - ahora) / 60000);
      throw new ErrorHttp(
        423,
        `Cuenta bloqueada por demasiados intentos fallidos. Volvé a intentar en ${minutosRestantes} minuto(s).`
      );
    }

    const passwordValida = await esPasswordValida(password, usuario.password_hash);
    if (!passwordValida) {
      await this.repository.registrarIntentoFallido(usuario.id, MAX_INTENTOS_FALLIDOS, MINUTOS_BLOQUEO);
      throw new ErrorHttp(401, "Credenciales inválidas");
    }

    if (usuario.failed_attempts > 0 || usuario.locked_until) {
      await this.repository.resetearIntentosFallidos(usuario.id);
    }

    return usuario;
  }

  async buscarPorId(id) {
    return this.repository.buscarPorId(id);
  }

  generarToken(usuario) {
    return generarToken({ id: usuario.id, email: usuario.email });
  }
}

export const usuarioService = new UsuarioService(usuarioRepository, categoriaRepository);
