import { pool } from "../config/database.js";
import { SELECT_MOVIMIENTO } from "./movimiento.repository.js";
import { ZONA_HORARIA } from "../utils/fecha.utils.js";

// Reglas de cálculo de todos los reportes:
// - Los 'internal' (reservas de MP) no cuentan.
// - La categoría que se compensa (nets_out, ej. "Sueldo") nunca cuenta como gasto.
// - Sin categoría (category_id NULL) es un bloque más.
// - Los meses van en hora argentina (como el resumen de Inicio).
//
// En todas las consultas: $1 = usuario, $2 = primer día del mes ("2026-10-01") y
// $3 = zona horaria. $4, si está, es la categoría (NULL = "Sin categoría") o una cantidad de días.

// Rango [inicio del mes, inicio del siguiente) en hora argentina. Se compara
// occurred_at contra un rango (y no date_trunc(occurred_at)) para que use el índice.
const EN_EL_MES = `m.occurred_at >= ($2::timestamp AT TIME ZONE $3)
  AND m.occurred_at < (($2::timestamp + interval '1 month') AT TIME ZONE $3)`;

// "c" es la categoría del movimiento (LEFT JOIN: NULL si no tiene).
const ES_GASTO = `m.type = 'expense' AND NOT COALESCE(c.nets_out, false)`;

// Ingresos del mes, igual que el resumen de Inicio: los ingresos comunes + el neto
// (entradas − salidas) de la categoría que se compensa, aunque dé negativo.
// Los 'internal' ya quedan afuera en el WHERE / JOIN de cada consulta.
const SUMA_INGRESOS = `COALESCE(SUM(m.amount) FILTER (WHERE m.type = 'income' AND NOT COALESCE(c.nets_out, false)), 0)
  + COALESCE(SUM(CASE m.type WHEN 'income' THEN m.amount ELSE -m.amount END) FILTER (WHERE c.nets_out), 0)`;
const SUMA_EGRESOS = `COALESCE(SUM(m.amount) FILTER (WHERE ${ES_GASTO}), 0)`;

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

  // Ingresos y egresos de los 6 meses que terminan en "mes" (incluido), del más viejo al más nuevo.
  async ingresosYEgresosUltimos6Meses(userId, mes) {
    const { rows } = await pool.query(
      `SELECT to_char(meses.inicio, 'YYYY-MM') AS month, ${SUMA_INGRESOS} AS income, ${SUMA_EGRESOS} AS expense
       FROM generate_series($2::timestamp - interval '5 months', $2::timestamp, interval '1 month') AS meses(inicio)
       LEFT JOIN (movements m LEFT JOIN categories c ON c.id = m.category_id)
         ON m.user_id = $1 AND m.type <> 'internal'
         AND m.occurred_at >= (meses.inicio AT TIME ZONE $3)
         AND m.occurred_at < ((meses.inicio + interval '1 month') AT TIME ZONE $3)
       GROUP BY meses.inicio
       ORDER BY meses.inicio`,
      [userId, primerDia(mes), ZONA_HORARIA]
    );
    return rows;
  },

  // Egresos del mes desde el día 1 hasta el día "dias" incluido (para "a esta altura del mes pasado").
  async egresosHastaElDia(userId, mes, dias) {
    const { rows } = await pool.query(
      `SELECT ${SUMA_EGRESOS} AS expense
       FROM movements m
       LEFT JOIN categories c ON c.id = m.category_id
       WHERE m.user_id = $1
         AND m.occurred_at >= ($2::timestamp AT TIME ZONE $3)
         AND m.occurred_at < (($2::timestamp + make_interval(days => $4)) AT TIME ZONE $3)`,
      [userId, primerDia(mes), ZONA_HORARIA, dias]
    );
    return rows[0].expense;
  },

  // Total del mes por persona con regla y por tipo (ingreso / egreso), de mayor a menor.
  // Se cruza por contraparte (no por categoría): cuentan también los movimientos de esa
  // persona anteriores a la regla. Solo sale el id y el nombre de la regla, nunca la contraparte.
  async totalesPorPersona(userId, mes) {
    const { rows } = await pool.query(
      `SELECT r.id, r.name, m.type, SUM(m.amount) AS total
       FROM movements m
       JOIN rules r ON r.user_id = m.user_id
         AND (r.counterparty_mp_id = m.counterparty_mp_id OR r.counterparty_account_hash = m.counterparty_account_hash)
       WHERE m.user_id = $1 AND m.type IN ('income', 'expense') AND ${EN_EL_MES}
       GROUP BY r.id, r.name, m.type
       ORDER BY total DESC, r.name COLLATE "und-x-icu"`,
      [userId, primerDia(mes), ZONA_HORARIA]
    );
    return rows;
  },

  // Para saber qué texto mostrar cuando no hay nadie: "todavía no nombraste a nadie" o "sin movimientos este mes".
  async tieneReglas(userId) {
    const { rowCount } = await pool.query("SELECT 1 FROM rules WHERE user_id = $1 LIMIT 1", [userId]);
    return rowCount > 0;
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
