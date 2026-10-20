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
  external_id        TEXT,   -- ID del pago de MP (NULL en los manuales)
  counterparty_mp_id BIGINT, -- ID de usuario MP de la otra persona (solo money_transfer)
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
  connected_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
