import { pool } from "../config/database.js";

// "und-x-icu" ordena como un humano (Á junto a A, sin separar mayúsculas de
// minúsculas). La collation por defecto de Neon (C.UTF-8) pone "Ánimo" después de "Zapatos".
const ORDEN_POR_NOMBRE = `name COLLATE "und-x-icu"`;

// Cantidad de movimientos de la categoría, para la pantalla de Ajustes → Categorías.
const CANTIDAD_MOVIMIENTOS = `(SELECT COUNT(*)::int FROM movements m WHERE m.category_id = categories.id) AS movement_count`;

export const categoriaRepository = {
  async listarPorUsuario(userId) {
    const { rows } = await pool.query(
      `SELECT id, name, icon, ${CANTIDAD_MOVIMIENTOS}
       FROM categories
       WHERE user_id = $1
       ORDER BY ${ORDEN_POR_NOMBRE}, id`,
      [userId]
    );
    return rows;
  },

  async existe(id, userId) {
    const { rowCount } = await pool.query("SELECT 1 FROM categories WHERE id = $1 AND user_id = $2", [id, userId]);
    return rowCount > 0;
  },

  async crear(userId, { nombre, icono }) {
    const { rows } = await pool.query(
      `INSERT INTO categories (user_id, name, icon)
       VALUES ($1, $2, $3)
       RETURNING id, name, icon, 0 AS movement_count`,
      [userId, nombre, icono]
    );
    return rows[0];
  },

  // Inserta todas en una sola consulta: unnest "despliega" los dos arrays en
  // filas (nombre[i], icono[i]). "db" es el pool o el client de una transacción.
  async crearVarias(userId, categorias, db = pool) {
    await db.query(
      `INSERT INTO categories (user_id, name, icon)
       SELECT $1, nombre, icono FROM unnest($2::text[], $3::text[]) AS c(nombre, icono)`,
      [userId, categorias.map((c) => c.nombre), categorias.map((c) => c.icono)]
    );
  },

  async renombrar(id, userId, nombre) {
    const { rows } = await pool.query(
      `UPDATE categories SET name = $3
       WHERE id = $1 AND user_id = $2
       RETURNING id, name, icon, ${CANTIDAD_MOVIMIENTOS}`,
      [id, userId, nombre]
    );
    return rows[0] ?? null;
  },

  async borrar(id, userId) {
    const { rowCount } = await pool.query("DELETE FROM categories WHERE id = $1 AND user_id = $2", [id, userId]);
    return rowCount > 0;
  },
};
