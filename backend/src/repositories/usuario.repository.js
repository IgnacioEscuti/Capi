import { pool } from "../config/database.js";

const COLUMNAS_PUBLICAS = "id, name, email, created_at";

export const usuarioRepository = {
  async buscarPorEmail(email) {
    const { rows } = await pool.query(
      `SELECT ${COLUMNAS_PUBLICAS}, password_hash, failed_attempts, locked_until
       FROM users WHERE email = $1`,
      [email]
    );
    return rows[0] ?? null;
  },

  async buscarPorId(id) {
    const { rows } = await pool.query(`SELECT ${COLUMNAS_PUBLICAS} FROM users WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  // "db" es el pool por defecto, o el client de una transacción.
  async crear({ nombre, email, passwordHash }, db = pool) {
    const { rows } = await db.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING ${COLUMNAS_PUBLICAS}`,
      [nombre, email, passwordHash]
    );
    return rows[0];
  },

  // En un UPDATE, cada expresión del SET lee los valores de la fila ANTES
  // del cambio, así que "failed_attempts + 1" es el mismo número en las dos
  // líneas. Al llegar al máximo se bloquea y el contador vuelve a 0, para
  // que al vencer el bloqueo arranque con todos los intentos de nuevo.
  async registrarIntentoFallido(id, maxIntentos, minutosBloqueo) {
    await pool.query(
      `UPDATE users
       SET failed_attempts = CASE WHEN failed_attempts + 1 >= $2 THEN 0 ELSE failed_attempts + 1 END,
           locked_until    = CASE WHEN failed_attempts + 1 >= $2
                                  THEN now() + make_interval(mins => $3)
                                  ELSE NULL END
       WHERE id = $1`,
      [id, maxIntentos, minutosBloqueo]
    );
  },

  async resetearIntentosFallidos(id) {
    await pool.query(
      "UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1",
      [id]
    );
  },
};
