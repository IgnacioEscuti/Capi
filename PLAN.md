# PLAN — Capi

App personal para registrar ingresos y egresos. Uso propio por ahora (quizás venderla a futuro). Solo mobile, solo pesos argentinos.

## Idea general

- Fuentes de dinero: **Mercado Pago** (carga automática desde la API de MP + reporte de liquidaciones para las transferencias a bancos) y **efectivo** (carga manual). Detalle en "Fuentes de datos".
- **Solo para usuarios de Mercado Pago.** Ningún banco argentino (Santander, Galicia, BBVA, Brubank) ni otra billetera (Ualá, Naranja X, Personal Pay, MODO, Lemon) tiene API pública para leer movimientos de una cuenta personal. La contraparte sí puede ser de cualquier banco.
Todo el dinero junto, sin separar por cuenta. Retiros de efectivo de MP = movimiento interno.
Transferencias a cuentas propias de otros bancos = egreso: esa plata sale del alcance de Capi (lo que se gaste desde ahí no aparece). Se categorizan a mano según la cuenta de destino (ej. “Ahorro” o “Servicios”). A futuro, una regla por CBU (huella) podría hacerlo sola.
- Cada usuario tiene su propia cuenta de MP asociada (diseño multiusuario desde el inicio).
- Funciones a futuro (de a una, cuando se pidan): categorías con autocategorización por reglas, reportes (saldo, resumen mensual, gráficos, comparación entre meses), presupuestos por categoría, exportar a Excel/PDF, carga rápida de efectivo, cuadrar caja, gastos fijos recurrentes, deudas/plata prestada.
- Fuera de alcance por ahora: cuotas de tarjeta, fotos de comprobantes.

## Stack

- **Front:** React Native + Expo (SDK 58, React Native 0.88; actualizado desde SDK 57 el 23/10/2026 porque Expo Go del iPhone pasó a SDK 58).
  - `app/.npmrc` con `legacy-peer-deps=true`: npm corta la instalación por la dependencia opcional `react-native-windows` del datetimepicker (pide React Native 0.85; no se usa). Sacarlo cuando el datetimepicker lo resuelva.
- Librerías de la app sumadas en la etapa 2: `@react-native-community/datetimepicker` (selector de fecha nativo).
- Sumada en la etapa 3: `expo-web-browser` (login de Mercado Pago dentro de la app).
- Sumadas en la etapa 6 (PROVISORIO-WEB, se sacan con la PWA): `react-native-web`, `react-dom`.
- **Back:** Node + Express, Passport (local + jwt), bcryptjs. Deploy en **Vercel** (plan Hobby), ejecutado como Vercel Functions con Fluid compute.
- **Base:** PostgreSQL en Neon, con el driver `pg` (SQL a mano, sin ORM).
- Primera vez con React Native, Expo y PostgreSQL: explicar conceptos nuevos comparando con React web y MongoDB/Mongoose. No sumar tecnologías nuevas sin hablarlo.

## Estructura del repo

```
/backend   API en Express
/app       App mobile en Expo
/docs      Diseños y referencias
```

## Diseño

Referencia: `docs/diseño/` (pantallas de Login, Registro, Inicio y hoja de paleta/tipografía de Claude Design).

- Solo modo oscuro. Fondo liso gris oscuro (#1A1B1E) con resplandor naranja sutil arriba (`expo-linear-gradient`). Sin imágenes de fondo.
- Acento naranja (#FF8A3D) solo para acciones: botones, "+", pestaña activa, links.
- Ingresos en verde (#3DDC84), egresos en rojo (#FF4D5E). Números importantes en blanco.
- Tipografía **Outfit** (`@expo-google-fonts/outfit`). Montos con `fontVariant: ['tabular-nums']`.
- Tarjetas un tono más claro que el fondo (#25262A), radios amplios.
- Navbar flotante glass (`expo-blur`) con 4 pestañas: Inicio, Movimientos, Reportes, Ajustes; botón "+" al costado. Dejar espacio abajo de las listas para que el navbar no tape el último ítem.
- Animaciones (Reanimated): **para más adelante**.

## Base de datos

```sql
CREATE TABLE users (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Etapa 2:

```sql
CREATE TABLE categories (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  icon       TEXT NOT NULL DEFAULT 'label',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE movements (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount      NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  occurred_at TIMESTAMPTZ NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  source      TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON movements (user_id, occurred_at DESC);
```

- Monto siempre positivo; el signo lo da `type`. Saldo = `SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END)`.
- `category_id` NULL = "Sin categoría". `ON DELETE SET NULL` resuelve el borrado de categorías.
- `source` indica el origen. En la etapa 3 se suma `'mp_api'` (monto no editable) y se agregan con `ALTER TABLE` el ID externo (para no duplicar) y el ID de usuario MP de la contraparte.
- **Zona horaria:** `occurred_at` guarda el instante exacto. Al agrupar por día o mes, siempre `occurred_at AT TIME ZONE 'America/Argentina/Buenos_Aires'`. La app muestra las fechas con la hora del teléfono.

- El esquema vive en `backend/schema.sql` y se ejecuta en la consola SQL de Neon.
- Convenciones: tablas en plural, columnas en `snake_case`. Plata siempre en `NUMERIC`.
- Consultas siempre parametrizadas (`$1`, `$2`…), nunca concatenando strings.

## Autenticación

Basada en la de AnimalPiletas, adaptada a Postgres y mobile.

- Capas: rutas → middlewares → controller → service → repository. DTO para no devolver nunca el hash.
- Passport: estrategias `registro` y `login` (passport-local) y `actual` (passport-jwt).
- Validación en middleware: datos obligatorios, formato de email, contraseña de mínimo 8 caracteres.
- Email normalizado (minúsculas, sin espacios) en el back antes de guardar y de buscar.
- Rate limit en login y registro (`express-rate-limit`).
- Bloqueo: 10 intentos fallidos → 2 minutos bloqueado.
- Mensaje genérico "Credenciales inválidas" (no revelar qué emails existen).
- Email duplicado: error de Postgres `23505` → 409.
- JWT de **30 días**, devuelto en el JSON del login, enviado por la app en el header `Authorization: Bearer <token>`.
- En la app, el token se guarda en `expo-secure-store`.
- Sin roles ni aprobación de cuentas.

## Etapas

### Etapa 1 — Registro + login ✅
- [x] Back: conexión a Neon con `pg`, `schema.sql`, endpoints de registro, login y usuario actual.
  - [x] `POST /api/auth/registro`, `POST /api/auth/login`, `GET /api/auth/actual` (Bearer token).
  - [x] Passport (`registro`, `login`, `actual`), bcryptjs, JWT de 30 días, DTO sin `password_hash`.
  - [x] Validación, email normalizado, rate limit, bloqueo 10 intentos / 2 min, 409 por `23505`.
  - [x] Middleware de errores central y 404 en JSON para rutas inexistentes.
  - [x] Contraseña de máximo 72 caracteres (límite de bcrypt).
  - [x] Probar contra la base real de Neon.
- [x] App (`/app`, Expo SDK 57 (hoy 58) + Expo Router, en JavaScript):
  - [x] Proyecto creado con la plantilla por defecto, sin los ejemplos. Tema en `src/theme`.
  - [x] `AuthContext` con `usuario`, `cargando`, `login`, `registro`, `logout`. Token en `expo-secure-store`; al abrir la app se valida con `GET /api/auth/actual`.
  - [x] Cerrar sesión = borrar el token del teléfono (JWT stateless, sin endpoint).
  - [x] Rutas protegidas con `Stack.Protected`: sin sesión solo `(auth)`, con sesión `(tabs)`.
  - [x] Pantallas Login y Registro según diseño, con errores por campo y generales.
  - [x] Inicio según diseño con datos de prueba en un solo archivo (`src/mocks/`), salvo el nombre del usuario, que es real.
  - [x] Navbar glass con Inicio, Movimientos, Reportes y Ajustes + botón "+" (sin acción por ahora).
  - [x] Movimientos y Reportes: pantallas vacías "Próximamente". Ajustes: solo "Cerrar sesión".
  - [x] URL del back en `EXPO_PUBLIC_API_URL` (IP local de la PC en desarrollo).
  - [x] Probar en el iPhone con Expo Go contra el back local.

### Etapa 2 — Movimientos manuales ✅
Hacen falta igual para el efectivo y definen la tabla de movimientos (ver "Tabla de movimientos").
- Cargar (botón "+"), editar y borrar movimientos manuales: tipo (ingreso/egreso), monto, fecha, descripción y categoría opcional (sin elegir → "Sin categoría").
- Lista de Movimientos.
- Inicio con datos reales (saldo y últimos movimientos) en vez de los mocks.
- Categorías por usuario:
  - Cada categoría sirve para ingresos y egresos.
  - Al registrarse se crean las comunes: Sueldo, Supermercado, Comida, Transporte, Servicios, Alquiler, Salud, Salidas, Compras, Otros.
  - Se crean desde el formulario ("+ Nueva categoría" al final del selector); se renombran y borran en Ajustes → Categorías.
  - Al borrar una categoría, sus movimientos quedan "Sin categoría".
- Pantallas: formulario de movimiento (con selector de categoría), lista de Movimientos, Ajustes → Categorías.
- Descripción opcional. Sin descripción, la fila muestra el nombre de la categoría o, si tampoco hay, "Ingreso"/"Egreso".
- Fecha en la carga manual: el día elegido + la hora actual.
- Las categorías iniciales se crean en la misma transacción que el usuario (todo o nada).
- El service valida que la categoría elegida sea del mismo usuario.
- Tablas: ver "Base de datos".
- Íconos de categoría (MaterialIcons de `@expo/vector-icons`, columna `icon`): las iniciales con el suyo (Sueldo `payments`, Supermercado `shopping-cart`, Comida `restaurant`, Transporte `directions-car`, Servicios `bolt`, Alquiler `home`, Salud `medical-services`, Salidas `local-bar`, Compras `shopping-bag`, Otros `category`). Las que crea el usuario llevan uno genérico (`label`), sin selector de íconos. "Sin categoría": `label-off`.
- Lista de Movimientos agrupada por mes, sin paginación (se trae todo; paginar más adelante si se pone lenta).
- Diseño: `docs/diseño/` (pantallas 4a–4k).

#### 2a — Back de movimientos y categorías
- [x] `schema.sql` con `categories`, `movements` y el índice.
- [x] Crear las tablas en Neon y correr el INSERT de categorías iniciales para los usuarios existentes (una sola vez).
- [x] Registro: usuario + 10 categorías iniciales en una transacción (`enTransaccion` en `config/database.js`). Lista en `config/categoriasIniciales.js`.
- [x] `/api/categorias`: GET (con cantidad de movimientos, orden alfabético), POST, PATCH `/:id`, DELETE `/:id`. Duplicado → 409.
- [x] `/api/movimientos`: GET (todos, más nuevo primero), POST, PUT `/:id`, DELETE `/:id`. Validación en middleware; el service verifica que la categoría sea del usuario (si no → 400).
- [x] `GET /api/inicio`: saldo, ingresos/egresos del mes (hora argentina) y últimos 5.
- [x] Todo filtrado por `user_id`; lo ajeno o inexistente → 404. DTOs con montos como número.
- [x] Probar con Thunder Client contra Neon.

#### 2b — App (decisiones):
- Formulario de movimiento: pantalla modal completa (`presentation: 'modal'`), la misma para crear y editar. Monto con teclado `decimal-pad` y formato es-AR mientras se escribe.
- Fecha: `@react-native-community/datetimepicker` (calendario nativo).
- Hojas de abajo (selector de categoría, renombrar): `Modal` de React Native, sin librerías. Cuando se sume Reanimated, evaluar `@gorhom/bottom-sheet` (permite arrastrar para cerrar).
- Refresco de datos: cada pantalla vuelve a pedir sus datos al quedar visible (`useFocusEffect`), mostrando los anteriores mientras carga.

#### 2b — App (checklist)
- [x] `@react-native-community/datetimepicker` instalado con `npx expo install`.
- [x] Services por recurso: `movimiento.service.js`, `categoria.service.js`, `inicio.service.js`. Hook `useDatosAlEnfocar` (useFocusEffect + datos anteriores mientras recarga).
- [x] Componentes reutilizables: `HojaInferior`, `DialogoConfirmacion`, `FormularioNombreCategoria` (crear y renombrar), `SelectorCategoria`, `IconoCategoria`, `BotonTexto`, `CampoBoton`.
- [x] Formulario de movimiento (`app/movimiento.js`, modal): tipo, monto con formato es-AR mientras se escribe, fecha (calendario en hoja en iOS, diálogo en Android), descripción, categoría. Crear y editar; borrar con confirmación.
- [x] Fecha enviada: día elegido + hora actual; al editar, se conserva el instante original si el día no cambia (si cambia, día nuevo + hora original).
- [x] Selector de categoría con "Sin categoría" y "+ Nueva categoría" (queda seleccionada al crearla).
- [x] Movimientos: agrupados por mes, tocar abre la edición, estado vacío.
- [x] Inicio con `GET /api/inicio`; `src/mocks` borrado. "Ver todos" lleva a Movimientos; tocar un movimiento abre la edición.
- [x] Ajustes → Categorías (Stack propio dentro de la pestaña): cantidad, renombrar y borrar con aviso de cuántos movimientos quedan "Sin categoría".
- [x] Probar en el iPhone con Expo Go contra el back local.

### Etapa 3 — Carga automática desde la API de MP ✅
Conexión por OAuth de MP (multiusuario). Sincronización por polling (ver "Fuentes de datos").

**3a — Deploy del back en Vercel**
Hace falta una URL pública para el retorno de OAuth. (Primero se pensó en Koyeb, pero la compró Mistral y ya no ofrece servidores comunes.)
- [x] Proyecto en Vercel (plan Hobby) con Root Directory `backend` y preset Express. Corre como Vercel Functions con Fluid compute.
- [x] Región `gru1` (São Paulo, la más cercana a Neon y a Argentina) en `backend/vercel.json`.
- [x] Variables en el panel de Vercel: `DATABASE_URL` (string **pooled** de Neon, branch production, con `sslmode=verify-full`), `JWT_SECRET` y `NODE_ENV=production`.
- [x] Misma base y mismo `JWT_SECRET` que en local: un token sacado en local sirve en producción y viceversa.
- [x] URL de producción: https://capi-phi-sandy.vercel.app
- [x] Probar producción con una cuenta de prueba (`prueba-<timestamp>@capi.test`): registro → 201 con las 10 categorías iniciales, login → token, `GET /api/auth/actual` sin token → 401 y con token → usuario, crear / listar / borrar un movimiento, `GET /api/inicio`. Todo corriendo en `gru1`.

Notas:
- El plan Hobby es solo para uso no comercial: si se vende la app, pasar a Pro.
- `express-rate-limit` guarda los contadores en memoria y en Vercel cada instancia cuenta por separado, así que pierde efectividad. El bloqueo por intentos fallidos sigue andando porque está en la base. No se cambia ahora (ver "Pendientes").

**3b — Back**
- Primero: verificar que un token obtenido por OAuth devuelve en `/v1/payments/search` lo mismo que el token de la aplicación (ingresos, transferencias MP, reservas). Si no, frenar y replantear.
  - [x] Verificado (20/10/2026, cuenta real). Detalle en "Fuentes de datos".
- OAuth de MP: callback fijo registrado en la app "Capi" de MP, intercambio del `code` por access token (180 días) y refresh token (scope `offline_access`).
  - `GET /api/mp/conectar?returnUrl=...` (con sesión) → `{ url }` de `auth.mercadopago.com/authorization` (`client_id`, `response_type=code`, `platform_id=mp`, `redirect_uri`, `state`).
  - `state` = JWT firmado con `JWT_SECRET` (`{ userId, returnUrl }`, audiencia `mp-oauth`, vence en 10 min). Sin PKCE: el back es cliente confidencial (tiene `client_secret`).
  - `returnUrl`: solo `exp://` (Expo Go) o `capi://` (app instalada); otra cosa → 400 (evita open redirect).
  - `GET /api/mp/callback` (sin sesión, lo llama MP): verifica el `state`, canjea el `code` (`POST api.mercadopago.com/oauth/token`), guarda la conexión y redirige a `returnUrl?mp=ok` o `?mp=error`. `state` inválido o vencido → 400 en texto. Nunca se loguean tokens ni `code`.
  - `GET /api/mp/estado` → `{ conectado, ultimaSincronizacion }`.
  - `DELETE /api/mp/conexion` → 204. Borra la conexión; los movimientos importados quedan.
- Tabla `mp_connections` (una fila por usuario; al reconectar se reemplaza y vuelve a ser "primera sincronización"). Tokens cifrados con AES-256-GCM (`crypto` de Node), clave `MP_TOKEN_KEY` (32 bytes en hex), formato `iv.tag.cifrado` en base64.
- `POST /api/mp/sincronizar` (con sesión) → `{ importados, ultimaSincronizacion }`.
  - Sin conexión → 409. Token/refresh inválido o revocado → 409 "Volvé a conectarla". MP caído o timeout (15 s) → 502.
  - Si al access token le quedan menos de 7 días, se renueva antes con el refresh token (se guardan los dos nuevos: MP rota el refresh token).
  - Rango (por fecha de aprobación): primera vez, últimos 5 días; después, desde `last_synced_at` − 1 día. Pagina `/v1/payments/search` de a 100 hasta traer todo.
  - Inserta con `ON CONFLICT DO NOTHING` (no duplica ni pisa ediciones), categoría null. `last_synced_at` = momento en que arrancó; se guarda en la misma transacción que los movimientos.
  - Fecha: `date_approved` (si no viene, `date_created`).
  - Monto: ingreso → `transaction_details.net_received_amount` (neto de retenciones); egreso → `transaction_details.total_paid_amount`; interno → `transaction_amount`. Si el campo falta o es 0, `transaction_amount`.
    - Verificado con pagos reales: `net_received_amount` = `transaction_amount` − `charges_details` del que cobra (ej. 35.500 − 355 de retención = 35.145). Las retenciones y comisiones las paga siempre el que cobra (`fee_payer: "collector"`), así que en un egreso lo que sale del saldo es el bruto (`total_paid_amount`), no el neto.
- Mapeo al importar:
  - Solo pagos con `status: "approved"`. Rechazados, cancelados y devoluciones no se importan (devoluciones: más adelante).
  - Regla general: `payer_id` == yo → egreso; `collector_id` == yo → ingreso. Vale para `money_transfer`, `account_fund`, `regular_payment` y `recurring_payment`.
  - Excepción `account_fund` (CVU): `payer` y `collector` son los dos yo → siempre ingreso, sin persona.
  - `money_transfer`: guarda el ID de MP de la contraparte.
  - `regular_payment` / `recurring_payment`: sin contraparte (es un comercio); descripción = `description`.
  - Quién es quién (verificado 20/10/2026): cuando yo cobro, MP trae `payer.id` y `collector_id`; cuando yo pago, trae `payer_id` (arriba de todo) y `collector.id`, con los otros en null. Se lee `payer_id ?? payer.id` y `collector_id ?? collector.id`.
  - `partition_transfer` → `internal`, descripción "A reserva: <nombre>" / "Desde reserva: <nombre>". La dirección sale de `point_of_interaction.business_info.branch`, que empieza con `AM-to-POT` o `POT-to-AM` (valores reales: `"AM-to-POT - Partition Transfer"`, `"POT-to-AM-Partition Transfer"`; se compara el comienzo).
  - Otros `operation_type` → no se importan.
- `movements`: `source` suma `'mp_api'`, `type` suma `'internal'` (aparece en la lista pero no suma ni resta en saldo ni en ingresos/egresos de `/api/inicio`), columnas `external_id` (TEXT) y `counterparty_mp_id` (BIGINT), `UNIQUE (user_id, source, external_id)`.
- Movimientos de MP:
  - `PUT`: solo cambian descripción y categoría. El body lleva tipo, monto y fecha iguales a los guardados; si cambian → 400. El PUT acepta tipo `internal` (para reenviar una reserva tal cual), pero un movimiento manual no puede ser `internal` → 400.
  - `DELETE` → 409 "Los movimientos de Mercado Pago no se pueden borrar".
  - Los DTO ya incluyen el origen (`origen`: `manual` / `mp_api`).
- Variables nuevas (obligatorias en `env.js`): `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `MP_REDIRECT_URI`, `MP_TOKEN_KEY`.

Checklist 3b:
- [x] `schema.sql` actualizado (`mp_connections`, CHECKs nuevos, `external_id`, `counterparty_mp_id`, UNIQUE).
- [x] Cifrado AES-256-GCM (`utils/cifrado.utils.js`) y `state` JWT (`utils/jwt.utils.js`).
- [x] Cliente de MP con `fetch` nativo (`clients/mercadoPago.client.js`): URL de autorización, canje, renovación, búsqueda paginada.
- [x] Mapeo de pagos (`utils/pagosMp.utils.js`), probado con pagos de ejemplo.
- [x] Rutas `/api/mp`: conectar, callback, estado, conexión (DELETE), sincronizar.
- [x] Reglas de PUT/DELETE para movimientos de MP; `internal` fuera del saldo y del resumen del mes.
- [x] Variables nuevas en `env.js` y `.env.example`.
- [x] Correr la migración en Neon (production).
- [x] Cargar las variables en Vercel y en el `.env` local; deploy.
- [x] Confirmar con pagos reales los campos de monto (`net_received_amount` / `total_paid_amount`) y de reservas (`business_info.branch`, nombres de la subpartición).
- [x] Corregido tras la prueba real: egresos (`payer_id` / `collector.id`) y `branch` de reservas con texto de más.
- [x] Probado en producción (cuenta de prueba): conectar, estado, sincronizar ×2 (9 → 0), movimientos, inicio (saldo sin `internal`), PUT de descripción 200 / monto y tipo 400, DELETE de MP 409, manual → `internal` 400, `returnUrl` inválida 400.
- [x] Deploy de la corrección y volver a probar: desconectar (204, movimientos quedan), sincronizar sin conexión 409, reconectar y sincronizar ×2 (11 egresos nuevos → 0). Saldo de `/api/inicio` = ingresos − egresos, sin la reserva.

**3c — App**
- Librería nueva: `expo-web-browser` (abrir el login de MP y volver a la app).
- Ajustes: conectar / desconectar Mercado Pago.
- Sincronizar al abrir la app y con pull to refresh en Inicio y Movimientos.
- Movimiento interno: gris, sin signo, descripción tipo "A reserva: Vacaciones" / "Desde reserva: Vacaciones".
- Pantallas nuevas (conectar MP en Ajustes, fila de movimiento interno): diseñarlas antes en Claude Design.
- Diseño: `docs/diseño/` (Mercado Pago · Sin conectar / Conectado, Error al conectar, Confirmar desconexión, Ajustes, Movimientos · con reservas / sincronizando, Inicio · sincronizando, Aviso de movimientos nuevos, Editar movimiento de Mercado Pago). Del diseño se tomó solo lo nuevo; navbar, Inicio, agrupado por mes y estructura del formulario quedan como estaban.

Decisiones 3c:
- La app usa el back de producción (`EXPO_PUBLIC_API_URL=https://capi-phi-sandy.vercel.app`): el callback de OAuth solo funciona ahí.
- `returnUrl` = `Linking.createURL('/ajustes/mercado-pago')`: en Expo Go `exp://<ip>:8081/--/ajustes/mercado-pago`, en la app instalada `capi://ajustes/mercado-pago` (scheme `capi` ya estaba en `app.json`). El back acepta las dos.
- `WebBrowser.openAuthSessionAsync`: en iOS el navegador se cierra solo al llegar a la `returnUrl` y devuelve la URL con `?mp=ok` / `?mp=error`. Error o cancelado → "No se pudo conectar".
- Estado de sincronización compartido con un Context (`SincronizacionContext`) montado en el layout de las pestañas: se monta solo con sesión, así que sincroniza al abrir la app y al iniciar sesión. Expone `sincronizando`, `conectado`, `version` (sube cuando entran movimientos nuevos y las pantallas recargan) y el aviso temporal.
- Una sola sincronización a la vez (si hay una en curso, se reutiliza).
- `POST /api/mp/sincronizar` con timeout de 30 s (el general es 10 s).

Checklist 3c:
- [x] `expo-web-browser` instalado con `npx expo install`. `EXPO_PUBLIC_API_URL` de producción en `.env` y `.env.example`.
- [x] `mercadoPago.service.js`: conectar, estado, desconectar, sincronizar.
- [x] Ajustes: fila "Mercado Pago" con estado (punto verde "Conectado" / "Sin conectar") arriba de Categorías.
- [x] Ajustes → Mercado Pago: sin conectar, conectado (última sincronización), error ("No se pudo conectar" + Reintentar), confirmación de desconectar.
- [x] `SincronizacionContext`: sincroniza al abrir la app; 409 sin aviso; otro error → aviso chico; "N movimientos nuevos de Mercado Pago" y recarga de la pantalla.
- [x] Pull to refresh (`RefreshControl`) en Inicio y Movimientos; "Sincronizando con Mercado Pago…" arriba de la lista.
- [x] Fila de movimiento interno: alcancía (`savings`), gris, sin signo, subtítulo "Movimiento interno".
- [x] Formulario de movimiento de MP: aviso "Importado de Mercado Pago…", tipo / monto / fecha con candado y deshabilitados, sin "Borrar"; al guardar reenvía tipo, monto y fecha originales.
- [x] Probar en el iPhone con Expo Go contra producción, conectando la cuenta real de MP.

### Etapa 4 — Transferencias a CBU (reporte de liquidaciones) ✅
Las transferencias a bancos no salen en `/v1/payments/search`, pero sí en el reporte de liquidaciones (`release_report`) de MP. Se suman como un paso extra de `POST /api/mp/sincronizar`. Lo que se verificó en "Fuentes de datos" → "Reporte de liquidaciones".

- **Asíncrono, sin esperar:** cada sincronización importa el reporte que pidió la anterior (si ya está en `/list`) y deja pedido el siguiente. Las transferencias entran en la sincronización siguiente a que MP lo genera.
  - **Un pedido por día.** Si se pide el mismo rango el mismo día, MP no genera otro reporte (verificado 23/10/2026), así que cuando ya se importó un reporte pedido hoy no se pide otro hasta mañana. Retraso máximo aceptado: un día.
  - Rango: desde las 00:00 (hora AR) del último día cubierto (`payouts_synced_until`) hasta ahora. La primera vez, desde `connected_at` − 5 días. Lo repetido no se inserta (`ON CONFLICT`).
  - El reporte pedido se busca en `/list` porque el `id` que devuelve el POST no es el de la lista. Sirve el que empieza ese mismo día (±1 día: MP redondea según la zona horaria de la cuenta) y termina después del momento del pedido.
  - Si en 24 h no aparece, se descarta y se pide otro.
  - **Nunca hace fallar la sincronización:** si algo falla, se loguea, devuelve 0 y se reintenta la próxima vez. Timeout de 8 s por llamada al reporte (el resto, 15 s).
  - `importados` suma pagos + transferencias (el aviso de la app no cambia).
- **Configuración del reporte** (se revisa antes de cada pedido): si la cuenta no tiene, se crea (columnas de Capi, sin programación, SFTP ni mails). Si ya tiene una, solo se le **agregan** las columnas que falten (`DATE`, `SOURCE_ID`, `DESCRIPTION`, `NET_DEBIT_AMOUNT`, `PAYOUT_BANK_ACCOUNT_NUMBER`); lo demás no se toca. El CSV se lee por nombre de columna y detecta el separador.
- **Mapeo:** solo filas `DESCRIPTION = payout` (los `payment` ya vienen por la API, `asset_management` no se importa, `reserve_*` es ruido). Egreso, monto `NET_DEBIT_AMOUNT`, fecha `DATE`, descripción "Transferencia a CBU …5968" (sin CBU: "Transferencia a banco"), `source = 'mp_api'`, `external_id = payout_<SOURCE_ID>` (el prefijo evita chocar con el ID de un pago).
- **CBU (dato de un tercero):** se guarda la huella HMAC-SHA256 (`counterparty_account_hash`, clave `CBU_HASH_KEY`) y los últimos 4 (`counterparty_account_last4`). Sirve para reconocer al destinatario y para reglas futuras (se calcula el HMAC del CBU que escriba el usuario y se compara) sin guardar el número. No va al DTO por ahora.
- **Base:** `movements` + `counterparty_account_hash`, `counterparty_account_last4`. `mp_connections` + `payouts_synced_until`, `payout_report_from`, `payout_report_requested_at` (se limpian al reconectar).
- **App:** en Ajustes → Mercado Pago, "Transferencias a bancos" en "Se importa solo", la nota de carga manual queda solo para el efectivo y, sin conectar, el aviso "Capi activa el reporte de liquidaciones de tu cuenta para traer las transferencias a bancos."

Checklist 4:
- [x] Verificar el reporte con la cuenta real (22–23/10/2026): aparecen los `payout`, IDs, CBU de destino, tiempos, rango congelado.
- [x] `schema.sql` actualizado (columnas nuevas en `movements` y `mp_connections`).
- [x] `CBU_HASH_KEY` en `env.js` (obligatoria, 64 hex) y `.env.example`; `huellaCbu` en `utils/cifrado.utils.js`.
- [x] Cliente: config (GET / POST / PUT), pedir, listar y descargar reporte, con timeout de 8 s.
- [x] Lectura del CSV y mapeo (`utils/reporteMp.utils.js`), probado con el reporte real (7 transferencias, mismo CBU → misma huella).
- [x] Flujo en `sincronizar` (`importarTransferencias`), probado con client y repositories falsos: primera vez sin config, config del usuario sin columnas, pedido no listo, pedido vencido, ya cubierto hoy, error de MP.
- [x] App: aviso y textos en Ajustes → Mercado Pago.
- [x] Correr la migración en Neon (`ALTER TABLE`).
- [x] Generar `CBU_HASH_KEY` y cargarla en el `.env` local y en Vercel; deploy.
- [x] Probar en producción con la cuenta real: sincronizar (pide el reporte), volver a sincronizar cuando esté listo (entran las transferencias), sincronizar otra vez (0 nuevas).
- [x] Ver el aviso y los textos nuevos en el iPhone.


### Etapa 5 — Reglas por persona + sueldo neto ✅
Orden después de esta etapa: PWA provisoria → Reportes. Face ID y recuperar contraseña, más adelante.

**Reglas**
- Tabla `rules`: `user_id`, contraparte (`counterparty_mp_id` **o** `counterparty_account_hash` + `counterparty_account_last4`), `name` (nombre de la persona que pone el usuario), `category_id`. Una regla por contraparte y usuario.
- Se crean desde el formulario de un movimiento de MP con contraparte: interruptor "Aplicar a los próximos de esta persona" + nombre. Ese movimiento se guarda con la categoría elegida.
- Al sincronizar, cada movimiento nuevo de MP con regla entra con su categoría y con el nombre como descripción. Solo al insertar: nunca pisa ediciones ni toca movimientos viejos.
- Ingresos desde bancos (CVU) no traen contraparte: sin regla, se editan a mano.
- Ajustes → Reglas: lista ("Juan → Sueldo"), editar nombre y categoría, borrar.
- Al crear la regla desde un movimiento, ese movimiento toma el nombre como descripción solo si la tenía vacía.
- El DTO de movimiento suma `tieneContraparte` (booleano, sin exponer el ID ni la huella) y `regla` (`{ id, nombre, categoria }` o `null`): la app muestra el interruptor solo con contraparte, y la fila "Regla: Juan → Sueldo" si ya tiene regla.

**Sueldo neto**
- Columna nueva en `categories` que marca la categoría que se compensa. Se le pone a "Sueldo" al registrarse; migración para los usuarios existentes.
- Resumen del mes (`/api/inicio`): esa categoría suma su neto (entradas − salidas) a ingresos, aunque dé negativo, y no suma a egresos. El saldo no cambia.

**Diseño (antes de programar)**
- Diseño en `docs/diseño/` (Editar movimiento MP A / B / C, Ajustes, Ajustes › Reglas, Reglas — vacío, Editar regla, Borrar regla — confirmación). De Ajustes se toma solo la fila "Reglas"; lo demás queda como está.

**5a — Back**
- Tabla `rules` con CHECK de una sola contraparte, `UNIQUE (user_id, counterparty_mp_id)` y `UNIQUE (user_id, counterparty_account_hash)`. `category_id` obligatoria con `ON DELETE CASCADE`: al borrar una categoría se borran sus reglas.
- `categories.nets_out` (Sueldo en `true` al registrarse: `compensa: true` en `categoriasIniciales.js`).
- La regla de un movimiento se busca por su contraparte (no se guarda qué regla lo categorizó): si se borra o edita la regla, los movimientos ya importados no cambian.
- `PUT /api/movimientos/:id` con `regla: { nombre }` (máx. 40 caracteres): no es de MP o no tiene contraparte → 400; sin categoría → 400; ya hay regla → 409 (lo detecta el UNIQUE).
- `/api/reglas`: GET, PUT `/:id` (`{ nombre, categoriaId }`), DELETE `/:id`. Sin POST (se crean desde el movimiento). DTO: `{ id, nombre, origen: 'mp' | 'cbu', ultimos4, categoria }`.

Checklist 5a:
- [x] `schema.sql` y migración aparte (`backend/migraciones/etapa-5a.sql`).
- [x] Registro: "Sueldo" con `nets_out = true`.
- [x] Resumen del mes con sueldo neto (`movimientoRepository.resumen`).
- [x] Crear regla desde el PUT de movimientos, en una transacción con la edición.
- [x] Rutas `/api/reglas` (GET, PUT, DELETE), filtradas por usuario.
- [x] Sincronizar: reglas cargadas una vez y aplicadas a pagos y transferencias a CBU al insertar. Probado con client y repositories falsos.
- [x] DTO de movimiento con `tieneContraparte` y `regla`.
- [x] Correr la migración en Neon.
- [x] Probar en local con una cuenta de prueba (puntos 1 a 4 + DTO; 30 chequeos OK, cuentas de prueba borradas).
- [ ] Deploy y probar en producción.

**5b — App**
- Del diseño se tomó solo lo nuevo; el resto respeta el estilo ya armado (campos en tarjeta con ícono, "Cancelar" en los modales, una tarjeta por fila en Ajustes).
- Editar regla es un modal en la raíz (`app/regla.js`), como el formulario de movimiento: se abre desde Ajustes → Reglas y desde la fila "Regla: …" del formulario (que ya es un modal). Recibe solo el `id` y busca la regla en `GET /api/reglas`, porque el DTO de movimiento no trae el origen.
- El formulario vuelve a pedir las reglas al quedar visible: si se editó o borró la regla desde ahí, la fila se actualiza (o vuelve a aparecer el interruptor).
- `SelectorCategoria` suma `conSinCategoria` (default `true`) y "+ Nueva categoría" solo aparece si se pasa `onNueva`: en Editar regla no se muestra ninguna de las dos (la categoría es obligatoria).
- Ícono de reglas: `person-outline` (MaterialIcons no tiene el de persona con flecha del diseño).
- Back: `GET/POST/PATCH /api/categorias` suman `cantidadReglas` (`rule_count`).

Checklist 5b:
- [x] `regla.service.js` (listar, actualizar, borrar) y `utils/reglas.js` (texto del origen, abrir Editar regla).
- [x] Formulario de movimiento de MP: interruptor "Aplicar a los próximos de esta persona" + nombre obligatorio y ayuda; exige categoría; manda `regla: { nombre }`; 409 como error. Con regla, fila "Regla: Juan → Sueldo" que abre Editar regla.
- [x] Ajustes: fila "Reglas" con cantidad, debajo de Categorías.
- [x] Ajustes → Reglas: lista (nombre, "Mercado Pago" / "CBU …1234", categoría con ícono), estado vacío, recarga al enfocar.
- [x] Editar regla: nombre, categoría, origen con candado, Guardar, "Borrar regla" con confirmación. Vuelve a la pantalla anterior.
- [x] Back: `cantidadReglas` en categorías (probado en local). Ajustes → Categorías avisa que se borran sus reglas.
- [x] La app compila (`expo export` de iOS sin errores). `expo lint` no corre: le falta `typescript` (no se instaló).
- [x] Probar en el iPhone contra el back local.
- [x] Deploy del back (5a + 5b) y probar en el iPhone contra producción: reglas por MP y por CBU, editar/borrar, aviso al borrar categoría, sueldo neto en Inicio y transferencia real entrando con regla.

### Etapa 6 — PWA provisoria ⬅ actual
Para usar y compartir Capi en el iPhone sin Expo Go ni cuenta de Apple, hasta pasar a la app nativa con TestFlight/App Store. (Se evaluaron EAS Update + Expo Go y TestFlight: el primero solo abre proyectos propios o de miembros de una organización de Expo; el segundo cuesta USD 99/año.)

- **Todo el código de la versión web es PROVISORIO y se elimina al pasar a la app nativa.** Cada parte va marcada con `PROVISORIO-WEB` (código y config, también en el back).
- Web: la misma app con React Native Web (`react-native-web`, `react-dom` con `npx expo install`), exportada con `npx expo export -p web`.
- Hosting: proyecto **nuevo** de Vercel con Root Directory `app` y `app/vercel.json` (build, salida y rewrite de `/api` a https://capi-phi-sandy.vercel.app, sin CORS). El proyecto lo crea Nacho desde el panel.
- PWA: manifest, ícono y meta tags de iOS para pantalla completa.
- Aviso de instalación: si se abre en Safari y no está instalada (no standalone), mostrar cómo agregarla (Compartir → Agregar a pantalla de inicio). En iPhone no se puede instalar sola.
- Adaptaciones web:
  - Token en `localStorage` (en nativo sigue `expo-secure-store`). Es el JWT de Capi, nunca el de MP (que no sale del back).
  - Fecha: `<input type="date">` nativo de Safari en lugar del datetimepicker.
  - Sin pull to refresh: sincroniza al abrir.
  - Navbar glass: verificar en Safari y ajustar lo mínimo.
- Conectar MP desde la PWA (para poder compartirla): en web, redirección completa a MP; vuelve a `https://<url-pwa>/ajustes/mercado-pago?mp=ok|error`. Back: `returnUrl` acepta también la URL de la variable nueva `WEB_URL`.
- Orden: 1) cambios en el código, 2) Nacho crea el proyecto en Vercel y anota la URL, 3) `WEB_URL` en Vercel (back) + deploy, 4) probar en el iPhone (instalar, login, movimientos, fecha, conectar MP, sincronizar).

Decisiones 6:
- Lo solo-web va en archivos `.web.js` (Expo los elige solo al compilar para web; el bundle nativo ni los incluye): `services/urlApi.web.js`, `services/token.storage.web.js`, `components/CalendarioFecha.web.js`, `components/AvisoInstalacion.web.js`, `utils/loginMp.web.js`. Sus versiones nativas hacen lo mismo que antes.
- `app/public/`: plantilla `index.html` (meta tags de iOS, `viewport-fit=cover`, sin zoom al tocar un campo), `manifest.json` e íconos 180/192/512 generados desde `assets/images/icon.png` (hoy es el ícono de la plantilla de Expo). Expo copia `public/` a `dist/`.
- Fecha en web: `<input type="date">` dentro de la hoja "Fecha" + botón "Listo" (Safari puede avisar cada giro de la ruedita).
- Pull to refresh: en web `RefreshControl` no hace nada (React Native Web lo dibuja como un `View`), así que no hubo que tocar nada; sincroniza al abrir como siempre.
- Navbar glass: `expo-blur` en web ya pone `-webkit-backdrop-filter` (Safari). Sin cambios.
- Rutas protegidas: en web, `Stack.Protected` lleva `redirectTo` (`/login` sin sesión, `/` con sesión); sin eso, abrir `/` sin sesión mostraba "Unmatched Route". En nativo queda `undefined`, como antes.
- Ajustes: `unstable_settings = { initialRouteName: 'index' }` para que al abrir directo `/ajustes/mercado-pago` (vuelta de MP) "Volver" tenga a dónde ir.
- Conectar MP en web: `window.location.assign(url)`; al volver, la pantalla lee `?mp=ok|error`, muestra lo mismo que en nativo y saca el parámetro de la URL.
- Back: `returnUrl` acepta exacto `${WEB_URL}/ajustes/mercado-pago` (sin query ni otras rutas); sin `WEB_URL` no cambia nada.

Checklist 6:
- [x] `react-native-web` y `react-dom` con `npx expo install`.
- [x] `npx expo export -p web` compila; llamadas a `/api` relativo en web.
- [x] `app/vercel.json`: build, `dist`, rewrite de `/api/:ruta*` al back y fallback a `index.html`.
- [x] PWA: `public/index.html`, `manifest.json`, íconos.
- [x] Aviso de instalación (iPhone fuera de standalone), con "Seguir en el navegador".
- [x] Token en `localStorage`, fecha con `<input type="date">`, sin pull to refresh, navbar revisado.
- [x] Conectar MP con redirección completa y resultado al volver.
- [x] Back: `WEB_URL` opcional en `env.js` y `.env.example`; validación de `returnUrl` probada (exacta OK; con query, otra ruta, otro dominio o http → 400; exp:// y capi:// siguen OK).
- [x] Probado en local (Edge headless con back falso): `/` sin sesión → login, aviso en iPhone, Inicio, Movimientos, formulario, Ajustes → MP con `?mp=error`. `expo export -p ios` sigue compilando.
- [ ] Nacho crea el proyecto en Vercel (Root Directory `app`) y anota la URL.
- [ ] `WEB_URL` en el proyecto del back + redeploy del back.
- [ ] Probar en el iPhone: aviso en Safari, instalar, login, movimientos, fecha, conectar MP (vuelve a la PWA), sincronizar, navbar glass.
- [ ] Probar que la app sigue igual en Expo Go.

### Etapa 7 — Reportes
Se define al terminar la etapa 6.

### Más adelante
- **Face ID** (`expo-local-authentication`): pedirlo al abrir la app y al volver de segundo plano tras más de 1 minuto. La contraseña se pide solo si el token venció, se cerró sesión o falla Face ID. Requiere development build (Expo Go no soporta Face ID en iPhone).
- **Recuperar contraseña:** código de 6 dígitos por email, vence en 15 minutos. Columnas nuevas: `reset_code_hash`, `reset_code_expires_at` (con `ALTER TABLE`). Envío con Nodemailer + Gmail (contraseña de aplicación). Primero probar un mail desde Vercel: si el SMTP está bloqueado, pasar a un servicio por API.

## Fuentes de datos (investigado y probado con cuenta real, oct 2026)

### API de Mercado Pago
Probado con Access Token de producción de la aplicación "Capi" (Checkout API) contra `GET /v1/payments/search` y `GET /v1/payments/{id}`.

**Token de OAuth (verificado, 20/10/2026):** trae lo mismo que el token de la aplicación. El canje del `code` devuelve access token por 180 días, scope con `offline_access` y `refresh_token`.

| Movimiento | ¿Aparece? | Datos |
|---|---|---|
| Ingreso desde cuenta MP | Sí | `operation_type: "money_transfer"`, `sub_type: "INTRA_PSP"`. Persona: `payer.id` (ID de usuario MP, fijo), `payer.identification` (CUIT), `payer.email`. Sin nombre. |
| Ingreso desde banco (CVU) | Sí, sin persona | `operation_type: "account_fund"`, `payment_method_id: "cvu"`, `sub_type: "INTER_PSP"`. El payer soy yo y `bank_info` viene en null. No se distingue un tercero de una cuenta propia. El detalle no trae más. |
| Egreso a cuenta MP | Sí | `payer_id` (yo) y `collector.id` (la otra persona), sin email ni CUIT. |
| Reservas | Sí | `operation_type: "partition_transfer"`, en los dos sentidos: branch `"AM-to-POT"` (a reserva) y `"POT-to-AM"` (desde reserva). El nombre no viene en `description` (null) sino en `amounts.collector.transaction_destination.subpartition.name` / `amounts.payer.transaction_source.partitions[0].subpartition.name`. Movimiento interno. |
| Egreso a banco (CBU) | No | Sale en el reporte de liquidaciones (ver abajo). |
| Pago con QR, comercios y suscripciones | Sí | `operation_type: "regular_payment"` (branch QR, Merchant Services, Marketplace, Virtual) o `"recurring_payment"`. `payer_id` (yo), `collector.id` (el comercio) y `description` con el comercio. |
| Pago con tarjeta de crédito | Sin confirmar | No se vio todavía. |

- Ingreso o egreso: si `collector_id` == yo → ingreso (persona en `payer.id`); si `payer_id` == yo → egreso (persona en `collector.id`).
- El ID de usuario MP de una persona es el mismo cuando me paga y cuando le pago.
- Retenciones (`charges_details`): a veces aparecen, pero se le cobran al que recibe.
- **Webhooks:** probado con webhook.site y el evento "Pagos". La simulación llega, pero mandar y recibir transferencias **no dispara ningún aviso**. Solo sirve para cobros hechos a través de una integración. → Se usa **polling**: el back consulta `/v1/payments/search` y guarda lo nuevo. La frecuencia (al abrir la app, cada X minutos, botón "actualizar") se define en la etapa 3.
- **Multiusuario:** OAuth de MP (botón "Conectar Mercado Pago"), sin auditoría ni costo.

### Reporte de liquidaciones (`release_report`, verificado 22–23/10/2026)
Endpoints en `api.mercadopago.com/v1/account/release_report`: `/config` (GET / POST / PUT), POST (pedir con `begin_date` / `end_date`), `/list` y `/<file_name>` (descarga del CSV). Mismo token de OAuth.
- **Transferencias a CBU:** `DESCRIPTION = payout`, cada una en 3 filas con el mismo `SOURCE_ID` (dos `reserve_for_payout` que se compensan y el `payout`). Trae fecha y hora, `NET_DEBIT_AMOUNT`, `SOURCE_ID` (12 dígitos), `PAYOUT_BANK_ACCOUNT_NUMBER` (CBU completo de destino, 22 dígitos) y `EXTERNAL_REFERENCE` (ID de Coelsa). **No trae el nombre** del destinatario. Los `SOURCE_ID` de los payouts dan 404 en `/v1/payments/{id}`: nunca vienen por las dos fuentes.
- También trae los `payment` (con `SOURCE_ID` = ID del pago de la API), `asset_management` (rendimientos) y `reserve_for_payment` (ruido).
- **Configuración:** una cuenta sin configuración da 404 en `/config`; MP la crea sola (con columnas por defecto, sin `PAYOUT_BANK_ACCOUNT_NUMBER`) al pedir el primer reporte. Los nombres de columna vienen en inglés aunque el idioma sea `es`.
- **Tiempos:** el primer reporte tardó ~2 h (mientras MP creaba la configuración); el segundo, menos de un minuto. MP manda un mail cuando está listo. `date_created` dice `-04:00` pero el valor está en UTC.
- MP redondea el rango a días enteros. El `id` que devuelve el POST no es el de `/list`. Pedir el mismo rango el mismo día no genera otro reporte.
- El "settlement report" (todas las transacciones) no hizo falta probarlo.

### Mails de MP (Gmail) — descartado
Se pensó para las transferencias a bancos (y pagos con tarjeta). Se descartó en la etapa 4: las transferencias salen en el reporte de liquidaciones, los pagos con tarjeta no interesan, y leer Gmail exige un permiso "restringido" de Google (máximo 100 usuarios sin verificar; para más, auditoría anual paga).

### Cobertura
- La API cubre ingresos, transferencias dentro de MP, reservas, pagos con QR/comercios y suscripciones. El reporte de liquidaciones cubre las transferencias a bancos (CBU).
- Queda manual: el efectivo y quién mandó los ingresos desde bancos (entran solos, sin persona).
- Rendimientos de MP: salen en el reporte (`asset_management`) pero **no se registran**.
- Pagos con tarjeta de crédito: no se importan (no interesan).

## Tabla de movimientos (requisitos para el diseño)

- Soporta varias fuentes: manual y MP (API de pagos + reporte de liquidaciones, los dos como `mp_api`).
- ID externo (ID del pago de MP, o `payout_<id>` en transferencias a bancos) para no duplicar.
- Persona identificada por el **ID de usuario MP**. Los ingresos por CVU entran sin persona: el usuario la agrega a mano.

## Movimientos, reglas y sueldo (definido para más adelante)

- **Reglas por persona:** "si el movimiento viene de / va a *tal persona* → categoría *tal*". Se aplican automáticamente a los movimientos de MP que entren **desde que se crea la regla**; no se aplican a los viejos. Funcionan solo con contrapartes de MP (clave: ID de usuario MP).
- **Sueldo neto:** una categoría puede tener movimientos que suman y que restan. Transferencias de ciertas personas → "Sueldo" (suman); pagos a empleados → también "Sueldo" (restan). Sueldo = suma de la categoría. Los pagos a empleados nunca cuentan como gasto en los reportes.
- **Editar movimientos:** cualquier movimiento se puede editar a mano. Una edición manual tiene prioridad: ninguna regla la pisa.
  - Movimientos de MP: se edita categoría y descripción; el **monto no** (viene del banco).
  - Movimientos de efectivo: se edita todo.
- Por ahora los pagos a empleados son a cuentas de MP, así que entran por la API. Si en algún momento son a bancos, entran por el reporte de liquidaciones sin ID de usuario MP: la regla tendría que ser por CBU (huella HMAC).

## Pendientes

- Transferencias a CBU rechazadas o devueltas por el banco: no apareció ninguna, no se sabe cómo vienen en el reporte. Por ahora se ignoran (si MP devuelve la plata, el egreso queda igual).
- Borrar la URL de webhook.site de la configuración de webhooks de la aplicación "Capi" en MP.
- Antes de diseñar algo que dependa de Mercado Pago, verificar qué datos da realmente la API.
- **Antes de vender:** pasar Vercel de Hobby a Pro, y hacer que el rate limit funcione con varias instancias (hoy está en memoria y cada instancia de Vercel cuenta por separado).
  - Rate limit en `POST /api/mp/sincronizar` (hoy se puede llamar sin límite y cada llamada le pega a MP).
  - Atar el `state` de OAuth al dispositivo: hoy, si alguien logra que otra persona abra una URL de autorización generada con su sesión (y la autorice en MP), la cuenta de MP de esa persona queda conectada al usuario Capi del otro.
  - Dos sincronizaciones simultáneas justo cuando toca renovar el token: la segunda usaría un refresh token ya rotado y pediría reconectar. Se evita con `SELECT ... FOR UPDATE` sobre la fila de `mp_connections`.