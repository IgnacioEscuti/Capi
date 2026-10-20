import { pool } from "../config/database.js";

// Los tokens llegan y salen cifrados: cifrar y descifrar es trabajo del service.
export const mpConexionRepository = {
  async buscarPorUsuario(userId) {
    const { rows } = await pool.query(
      `SELECT user_id, mp_user_id, access_token, refresh_token, expires_at, last_synced_at, connected_at
       FROM mp_connections WHERE user_id = $1`,
      [userId]
    );
    return rows[0] ?? null;
  },

  // Si el usuario se reconecta, la fila se reemplaza y vuelve a arrancar
  // como primera sincronización.
  async guardar(userId, { mpUserId, accessToken, refreshToken, expiraEn }) {
    await pool.query(
      `INSERT INTO mp_connections (user_id, mp_user_id, access_token, refresh_token, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE
       SET mp_user_id = EXCLUDED.mp_user_id,
           access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           expires_at = EXCLUDED.expires_at,
           last_synced_at = NULL,
           connected_at = now()`,
      [userId, mpUserId, accessToken, refreshToken, expiraEn]
    );
  },

  async actualizarTokens(userId, { accessToken, refreshToken, expiraEn }) {
    await pool.query(
      `UPDATE mp_connections SET access_token = $2, refresh_token = $3, expires_at = $4
       WHERE user_id = $1`,
      [userId, accessToken, refreshToken, expiraEn]
    );
  },

  // "db" es el pool o el client de una transacción.
  async registrarSincronizacion(userId, fecha, db = pool) {
    await db.query("UPDATE mp_connections SET last_synced_at = $2 WHERE user_id = $1", [userId, fecha]);
  },

  async borrar(userId) {
    await pool.query("DELETE FROM mp_connections WHERE user_id = $1", [userId]);
  },
};
