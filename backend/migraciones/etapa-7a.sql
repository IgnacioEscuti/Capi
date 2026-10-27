-- Etapa 7a: color por categoría (solo se usa en Reportes).
-- Correr UNA sola vez en la consola SQL de Neon (todo junto: si algo falla,
-- el ROLLBACK automático de la transacción deja la base como estaba).

BEGIN;

ALTER TABLE categories ADD COLUMN color TEXT;

-- 1) Las categorías iniciales (si conservan el nombre) toman su color fijo,
--    el mismo que reciben al registrarse (config/categoriasIniciales.js).
UPDATE categories c
SET color = i.color
FROM (VALUES
  ('Sueldo', '#E58BE0'),
  ('Supermercado', '#5EC8F2'),
  ('Comida', '#FFC857'),
  ('Transporte', '#F78FB3'),
  ('Servicios', '#C39BFF'),
  ('Alquiler', '#8B9CFF'),
  ('Salud', '#B5D96A'),
  ('Salidas', '#6FD6C6'),
  ('Compras', '#E0B48A'),
  ('Otros', '#FF9C8A')
) AS i(name, color)
WHERE c.name = i.name;

-- 2) El resto (creadas por el usuario o renombradas), de la más vieja a la más
--    nueva: primero los colores de la paleta que ese usuario todavía no usa; si se
--    terminan, se repite la paleta desde el principio.
--    (La paleta es la misma de PALETA_CATEGORIAS, en el mismo orden.)
WITH paleta(color, orden) AS (VALUES
  ('#8B9CFF', 1), ('#5EC8F2', 2), ('#C39BFF', 3), ('#FFC857', 4), ('#F78FB3', 5),
  ('#6FD6C6', 6), ('#E0B48A', 7), ('#B5D96A', 8), ('#FF9C8A', 9), ('#E58BE0', 10),
  ('#4B84D2', 11), ('#624BD2', 12), ('#A54BD2', 13), ('#D24BA5', 14), ('#D24B6D', 15),
  ('#4BC7D2', 16), ('#4BA5D2', 17), ('#D2B74B', 18), ('#D28F4B', 19), ('#8FD24B', 20),
  ('#B4F3F9', 21), ('#B4D0F9', 22), ('#BDB4F9', 23), ('#E6B4F9', 24), ('#F9B4E2', 25),
  ('#F9B4B9', 26), ('#F9C8B4', 27), ('#F9F9B4', 28), ('#D0F9B4', 29), ('#B4F9E2', 30)
),
libres AS (
  SELECT u.id AS user_id, p.color, ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY p.orden) AS n
  FROM users u
  CROSS JOIN paleta p
  WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.user_id = u.id AND c.color = p.color)
),
cantidad_libres AS (
  SELECT user_id, COUNT(*) AS total FROM libres GROUP BY user_id
),
pendientes AS (
  SELECT id, user_id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY id) AS n
  FROM categories
  WHERE color IS NULL
)
UPDATE categories c
SET color = COALESCE(
  l.color,
  (SELECT p.color FROM paleta p WHERE p.orden = (pe.n - COALESCE(cl.total, 0) - 1) % 30 + 1)
)
FROM pendientes pe
LEFT JOIN libres l ON l.user_id = pe.user_id AND l.n = pe.n
LEFT JOIN cantidad_libres cl ON cl.user_id = pe.user_id
WHERE c.id = pe.id;

ALTER TABLE categories ALTER COLUMN color SET NOT NULL;

COMMIT;
