export const env = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  MP_CLIENT_ID: process.env.MP_CLIENT_ID,
  MP_CLIENT_SECRET: process.env.MP_CLIENT_SECRET,
  MP_REDIRECT_URI: process.env.MP_REDIRECT_URI,
  MP_TOKEN_KEY: process.env.MP_TOKEN_KEY,
  CBU_HASH_KEY: process.env.CBU_HASH_KEY,
};

const requeridas = [
  "DATABASE_URL",
  "JWT_SECRET",
  "MP_CLIENT_ID",
  "MP_CLIENT_SECRET",
  "MP_REDIRECT_URI",
  "MP_TOKEN_KEY",
  "CBU_HASH_KEY",
];
const faltantes = requeridas.filter((nombre) => !env[nombre]);

if (faltantes.length > 0) {
  console.error(
    `Faltan variables de entorno obligatorias: ${faltantes.join(", ")}. ` +
      `Cargalas en el archivo .env (o en el panel del hosting) antes de iniciar el servidor.`
  );
  process.exit(1);
}

// AES-256 necesita una clave de exactamente 32 bytes (64 caracteres hex).
// Lo mismo para la clave del HMAC de los CBU (32 bytes, igual que SHA-256).
for (const nombre of ["MP_TOKEN_KEY", "CBU_HASH_KEY"]) {
  if (!/^[0-9a-f]{64}$/i.test(env[nombre])) {
    console.error(`${nombre} tiene que ser de 32 bytes en hexadecimal (64 caracteres).`);
    process.exit(1);
  }
}
