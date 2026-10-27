CREATE TABLE users (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  icon       TEXT NOT NULL DEFAULT 'label',
  -- Categoría que se compensa (ej. "Sueldo": cobros menos pagos a empleados).
  -- En el resumen del mes suma su neto a ingresos y no cuenta como egreso.
  nets_out   BOOLEAN NOT NULL DEFAULT false,
  -- Color en Reportes (hex, de PALETA_CATEGORIAS en config/categoriasIniciales.js).
  color      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE movements (
  id                 INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type               TEXT NOT NULL CHECK (type IN ('income', 'expense', 'internal')),
  amount             NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  occurred_at        TIMESTAMPTZ NOT NULL,
  description        TEXT,
  category_id        INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  source             TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'mp_api')),
  external_id        TEXT,   -- ID del pago de MP, o "payout_<id>" en transferencias a bancos (NULL en los manuales)
  counterparty_mp_id BIGINT, -- ID de usuario MP de la otra persona (solo money_transfer)
  -- CBU de destino de una transferencia a banco (dato de un tercero): solo la
  -- huella HMAC-SHA256 (clave en CBU_HASH_KEY) y los últimos 4 dígitos.
  counterparty_account_hash  TEXT,
  counterparty_account_last4 TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, source, external_id)
);

CREATE INDEX ON movements (user_id, occurred_at DESC);

-- Una conexión de MP por usuario. Los tokens se guardan cifrados con
-- AES-256-GCM (clave en MP_TOKEN_KEY), en formato "iv.tag.cifrado" en base64.
CREATE TABLE mp_connections (
  user_id        INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mp_user_id     BIGINT NOT NULL,
  access_token   TEXT NOT NULL,
  refresh_token  TEXT NOT NULL,
  expires_at     TIMESTAMPTZ NOT NULL,
  last_synced_at TIMESTAMPTZ,
  connected_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Transferencias a bancos (reporte de liquidaciones, asíncrono):
  payouts_synced_until       TIMESTAMPTZ, -- hasta cuándo cubre el último reporte importado
  payout_report_from         TIMESTAMPTZ, -- inicio del reporte pedido y todavía no importado (NULL = ninguno)
  payout_report_requested_at TIMESTAMPTZ  -- cuándo se pidió ese reporte
);

-- Reglas por persona: los movimientos nuevos de MP con esta contraparte entran
-- con esta categoría y con el nombre como descripción. La contraparte es el ID
-- de usuario MP o la huella del CBU de destino (nunca las dos).
CREATE TABLE rules (
  id                         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id                    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  counterparty_mp_id         BIGINT,
  counterparty_account_hash  TEXT,
  counterparty_account_last4 TEXT,
  name                       TEXT NOT NULL,
  category_id                INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((counterparty_mp_id IS NULL) <> (counterparty_account_hash IS NULL)),
  UNIQUE (user_id, counterparty_mp_id),
  UNIQUE (user_id, counterparty_account_hash)
);
