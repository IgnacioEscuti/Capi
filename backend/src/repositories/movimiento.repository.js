import { pool } from "../config/database.js";

const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

// Movimiento + nombre e ícono de su categoría (null si no tiene).
const SELECT_MOVIMIENTO = `
  SELECT m.id, m.type, m.amount, m.occurred_at, m.description, m.source,
         m.category_id, c.name AS category_name, c.icon AS category_icon
  FROM movements m
  LEFT JOIN categories c ON c.id = m.category_id`;

export const movimientoRepository = {
  // Sin "limite" trae todos: en Postgres, LIMIT NULL equivale a no poner límite.
  async listarPorUsuario(userId, limite = null) {
    const { rows } = await pool.query(
      `${SELECT_MOVIMIENTO}
       WHERE m.user_id = $1
       ORDER BY m.occurred_at DESC, m.id DESC
       LIMIT $2`,
      [userId, limite]
    );
    return rows;
  },

  async buscarPorId(id, userId) {
    const { rows } = await pool.query(`${SELECT_MOVIMIENTO} WHERE m.id = $1 AND m.user_id = $2`, [id, userId]);
    return rows[0] ?? null;
  },

  async crear(userId, { tipo, monto, fecha, descripcion, categoriaId }) {
    const { rows } = await pool.query(
      `INSERT INTO movements (user_id, type, amount, occurred_at, description, category_id, source)
       VALUES ($1, $2, $3, $4, $5, $6, 'manual')
       RETURNING id`,
      [userId, tipo, monto, fecha, descripcion, categoriaId]
    );
    return rows[0].id;
  },

  async actualizar(id, userId, { tipo, monto, fecha, descripcion, categoriaId }) {
    const { rowCount } = await pool.query(
      `UPDATE movements
       SET type = $3, amount = $4, occurred_at = $5, description = $6, category_id = $7, updated_at = now()
       WHERE id = $1 AND user_id = $2`,
      [id, userId, tipo, monto, fecha, descripcion, categoriaId]
    );
    return rowCount > 0;
  },

  async borrar(id, userId) {
    const { rowCount } = await pool.query("DELETE FROM movements WHERE id = $1 AND user_id = $2", [id, userId]);
    return rowCount > 0;
  },

  // Saldo total + ingresos y egresos del mes actual. El mes se calcula en hora
  // argentina: un movimiento del 31 a las 22 h (hora AR) ya es 1 del mes
  // siguiente en UTC, y sin AT TIME ZONE caería en el mes equivocado.
  async resumen(userId) {
    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS balance,
         COALESCE(SUM(amount) FILTER (WHERE type = 'income' AND es_este_mes), 0) AS month_income,
         COALESCE(SUM(amount) FILTER (WHERE type = 'expense' AND es_este_mes), 0) AS month_expense
       FROM (
         SELECT type, amount,
                date_trunc('month', occurred_at AT TIME ZONE $2) = date_trunc('month', now() AT TIME ZONE $2) AS es_este_mes
         FROM movements
         WHERE user_id = $1
       ) AS movimientos`,
      [userId, ZONA_HORARIA]
    );
    return rows[0];
  },
};
