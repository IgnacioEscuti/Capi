import pg from "pg";
import { env } from "./env.js";

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: true,
});

// Neon cierra las conexiones inactivas: sin este listener, ese error
// en una conexión ociosa del pool tiraría abajo todo el proceso.
pool.on("error", (error) => {
  console.error("Error en una conexión inactiva de la base:", error.message);
});

// Corre "callback" dentro de una transacción: si termina bien se hace COMMIT,
// si tira error se hace ROLLBACK y no queda nada guardado. Usa un client
// propio porque BEGIN, las consultas y COMMIT tienen que ir por la misma
// conexión. El callback recibe ese client y lo pasa a los repositories.
export async function enTransaccion(callback) {
  const client = await pool.connect();
  let errorDeConexion;

  try {
    await client.query("BEGIN");
    const resultado = await callback(client);
    await client.query("COMMIT");
    return resultado;
  } catch (error) {
    // Si el ROLLBACK también falla, la conexión quedó rota: se guarda el
    // error para descartarla en vez de devolverla al pool.
    await client.query("ROLLBACK").catch((errorRollback) => {
      errorDeConexion = errorRollback;
    });
    throw error;
  } finally {
    client.release(errorDeConexion);
  }
}

export async function verificarConexion() {
  await pool.query("SELECT 1");
  console.log("Conectado a PostgreSQL");
}
