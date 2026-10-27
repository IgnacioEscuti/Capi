import { pool } from "../config/database.js";
import { SELECT_MOVIMIENTO } from "./movimiento.repository.js";
import { ZONA_HORARIA } from "../utils/fecha.utils.js";

// Reglas de cálculo de todos los reportes:
// - Los 'internal' (reservas de MP) no cuentan.
// - La categoría que se compensa (nets_out, ej. "Sueldo") nunca cuenta como gasto.
// - Sin categoría (category_id NULL) es un bloque más.
// - Los meses van en hora argentina (como el resumen de Inicio).
//
// En todas las consultas: $1 = usuario, $2 = primer día del mes ("2026-10-01"),
// $3 = zona horaria y $4 = categoría (NULL = "Sin categoría").

// Rango [inicio del mes, inicio del siguiente) en hora argentina. Se compara
// occurred_at contra un rango (y no date_trunc(occurred_at)) para que use el índice.
const EN_EL_MES = `m.occurred_at >= ($2::timestamp AT TIME ZONE $3)
  AND m.occurred_at < (($2::timestamp + interval '1 month') AT TIME ZONE $3)`;

// "c" es la categoría del movimiento (LEFT JOIN: NULL si no tiene).
const ES_GASTO = `m.type = 'expense' AND NOT COALESCE(c.nets_out, false)`;

// IS NOT DISTINCT FROM es "=" pero tratando NULL como un valor más: con
// $4 = NULL trae los "Sin categoría" (con "=" no traería ninguno).
const DE_LA_CATEGORIA = `m.category_id IS NOT DISTINCT FROM $4`;

const primerDia = (mes) => `${mes}-01`;

export const reporteRepository = {
  // Ingresos y egresos del mes (sin los internos): 0 = estado vacío.
  async contarMovimientos(userId, mes) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS movement_count
       FROM movements m
       WHERE m.user_id = $1 AND m.type <> 'internal' AND ${EN_EL_MES}`,
      [userId, primerDia(mes), ZONA_HORARIA]
    );
    return rows[0].movement_count;
  },

  // Total gastado y cantidad de gastos por categoría, de mayor a menor.
  async gastosPorCategoria(userId, mes) {
    const { rows } = await pool.query(
      `SELECT m.category_id, c.name, c.icon, c.color,
              SUM(m.amount) AS total, COUNT(*)::int AS movement_count
       FROM movements m
       LEFT JOIN categories c ON c.id = m.category_id
       WHERE m.user_id = $1 AND ${ES_GASTO} AND ${EN_EL_MES}
       GROUP BY m.category_id, c.name, c.icon, c.color
       ORDER BY total DESC, c.name COLLATE "und-x-icu" NULLS LAST`,
      [userId, primerDia(mes), ZONA_HORARIA]
    );
    return rows;
  },

  // Gasto de una categoría en los 12 meses que terminan en "mes" (incluido).
  // generate_series arma los 12 meses: los que no tienen gastos quedan en 0.
  async gastosUltimos12Meses(userId, categoriaId, mes) {
    const { rows } = await pool.query(
      `SELECT to_char(meses.inicio, 'YYYY-MM') AS month, COALESCE(SUM(m.amount), 0) AS total
       FROM generate_series($2::timestamp - interval '11 months', $2::timestamp, interval '1 month') AS meses(inicio)
       LEFT JOIN (movements m LEFT JOIN categories c ON c.id = m.category_id)
         ON m.user_id = $1 AND ${DE_LA_CATEGORIA} AND ${ES_GASTO}
         AND m.occurred_at >= (meses.inicio AT TIME ZONE $3)
         AND m.occurred_at < ((meses.inicio + interval '1 month') AT TIME ZONE $3)
       GROUP BY meses.inicio
       ORDER BY meses.inicio`,
      [userId, primerDia(mes), ZONA_HORARIA, categoriaId]
    );
    return rows;
  },

  // Los gastos de la categoría en el mes, más nuevo primero (mismas columnas que la lista de Movimientos).
  async gastosDelMes(userId, categoriaId, mes) {
    const { rows } = await pool.query(
      `${SELECT_MOVIMIENTO}
       WHERE m.user_id = $1 AND ${DE_LA_CATEGORIA} AND ${ES_GASTO} AND ${EN_EL_MES}
       ORDER BY m.occurred_at DESC, m.id DESC`,
      [userId, primerDia(mes), ZONA_HORARIA, categoriaId]
    );
    return rows;
  },
};
