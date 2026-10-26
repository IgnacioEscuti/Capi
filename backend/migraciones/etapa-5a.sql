-- Etapa 5a: reglas por persona + sueldo neto.
-- Correr UNA sola vez en la consola SQL de Neon (todo junto: si algo falla,
-- el ROLLBACK automático de la transacción deja la base como estaba).

BEGIN;

ALTER TABLE categories ADD COLUMN nets_out BOOLEAN NOT NULL DEFAULT false;

-- La categoría "Sueldo" de los usuarios existentes pasa a compensarse.
UPDATE categories SET nets_out = true WHERE name = 'Sueldo';

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

COMMIT;
