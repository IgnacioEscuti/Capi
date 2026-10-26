import { pool } from "../config/database.js";

// Regla + su categoría, para mostrar. El origen se calcula en la consulta para
// que el ID de MP y la huella del CBU nunca salgan de la base.
const SELECT_REGLA = `
  SELECT r.id, r.name, r.counterparty_account_last4,
         CASE WHEN r.counterparty_mp_id IS NOT NULL THEN 'mp' ELSE 'cbu' END AS origin,
         r.category_id, c.name AS category_name, c.icon AS category_icon
  FROM rules r
  JOIN categories c ON c.id = r.category_id`;

export const reglaRepository = {
  async listarPorUsuario(userId) {
    const { rows } = await pool.query(
      `${SELECT_REGLA}
       WHERE r.user_id = $1
       ORDER BY r.name COLLATE "und-x-icu", r.id`,
      [userId]
    );
    return rows;
  },

  async buscarPorId(id, userId) {
    const { rows } = await pool.query(`${SELECT_REGLA} WHERE r.id = $1 AND r.user_id = $2`, [id, userId]);
    return rows[0] ?? null;
  },

  // Para la sincronización: solo lo necesario para reconocer la contraparte.
  async listarParaAplicar(userId) {
    const { rows } = await pool.query(
      `SELECT counterparty_mp_id, counterparty_account_hash, name, category_id
       FROM rules WHERE user_id = $1`,
      [userId]
    );
    return rows;
  },

  // "db" es el pool o el client de una transacción. Si ya hay una regla para
  // esa contraparte, el UNIQUE de la tabla tira error 23505.
  async crear(userId, { contraparteMpId, cuentaHash, cuentaUltimos4, nombre, categoriaId }, db = pool) {
    const { rows } = await db.query(
      `INSERT INTO rules (user_id, counterparty_mp_id, counterparty_account_hash, counterparty_account_last4, name, category_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, contraparteMpId, cuentaHash, cuentaUltimos4, nombre, categoriaId]
    );
    return rows[0].id;
  },

  // La contraparte no se cambia: solo nombre y categoría.
  async actualizar(id, userId, { nombre, categoriaId }) {
    const { rowCount } = await pool.query(
      `UPDATE rules SET name = $3, category_id = $4, updated_at = now()
       WHERE id = $1 AND user_id = $2`,
      [id, userId, nombre, categoriaId]
    );
    return rowCount > 0;
  },

  async borrar(id, userId) {
    const { rowCount } = await pool.query("DELETE FROM rules WHERE id = $1 AND user_id = $2", [id, userId]);
    return rowCount > 0;
  },
};
