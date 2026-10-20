# PLAN — Capi

App personal para registrar ingresos y egresos. Uso propio por ahora (quizás venderla a futuro). Solo mobile, solo pesos argentinos.

## Idea general

- Fuentes de dinero: **Mercado Pago** (carga automática desde la API de MP + mails de MP en Gmail) y **efectivo** (carga manual). Detalle en "Fuentes de datos".
- **Solo para usuarios de Mercado Pago.** Ningún banco argentino (Santander, Galicia, BBVA, Brubank) ni otra billetera (Ualá, Naranja X, Personal Pay, MODO, Lemon) tiene API pública para leer movimientos de una cuenta personal. La contraparte sí puede ser de cualquier banco.
- Todo el dinero junto, sin separar por cuenta. Retiros de efectivo de MP y transferencias entre cuentas propias = movimiento interno.
- Cada usuario tiene su propia cuenta de MP asociada (diseño multiusuario desde el inicio).
- Funciones a futuro (de a una, cuando se pidan): categorías con autocategorización por reglas, reportes (saldo, resumen mensual, gráficos, comparación entre meses), presupuestos por categoría, exportar a Excel/PDF, carga rápida de efectivo, cuadrar caja, gastos fijos recurrentes, deudas/plata prestada.
- Fuera de alcance por ahora: cuotas de tarjeta, fotos de comprobantes.

## Stack

- **Front:** React Native + Expo.
- Librerías de la app sumadas en la etapa 2: `@react-native-community/datetimepicker` (selector de fecha nativo).
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
- [x] App (`/app`, Expo SDK 57 + Expo Router, en JavaScript):
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

### Etapa 2 — Movimientos manuales
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
- [ ] Probar en el iPhone con Expo Go contra el back local.

### Etapa 3 — Carga automática desde la API de MP ⬅ actual
Conexión por OAuth de MP (multiusuario). Sincronización por polling (ver "Fuentes de datos").

**3a — Deploy del back en Vercel**
Hace falta una URL pública para el retorno de OAuth. (Primero se pensó en Koyeb, pero la compró Mistral y ya no ofrece servidores comunes.)
- [x] Proyecto en Vercel (plan Hobby) con Root Directory `backend` y preset Express. Corre como Vercel Functions con Fluid compute.
- [x] Región `gru1` (São Paulo, la más cercana a Neon y a Argentina) en `backend/vercel.json`.
- [x] Variables en el panel de Vercel: `DATABASE_URL` (string **pooled** de Neon, branch production, con `sslmode=verify-full`), `JWT_SECRET` y `NODE_ENV=production`.
- [x] Misma base y mismo `JWT_SECRET` que en local: un token sacado en local sirve en producción y viceversa.
- [x] URL de producción: https://capi-phi-sandy.vercel.app
- [ ] Probar producción con curl: `GET /api/auth/actual` sin token → 401, login → token, `GET /api/inicio` y `GET /api/categorias` con datos reales, función corriendo en `gru1`.

Notas:
- El plan Hobby es solo para uso no comercial: si se vende la app, pasar a Pro.
- `express-rate-limit` guarda los contadores en memoria y en Vercel cada instancia cuenta por separado, así que pierde efectividad. El bloqueo por intentos fallidos sigue andando porque está en la base. No se cambia ahora (ver "Pendientes").

**3b — Back**
- Primero: verificar que un token obtenido por OAuth devuelve en `/v1/payments/search` lo mismo que el token de la aplicación (ingresos, transferencias MP, reservas). Si no, frenar y replantear.
- OAuth de MP: URL de autorización con `state` (y PKCE si se puede), callback fijo registrado en la app "Capi" de MP, intercambio del `code` por access token (180 días) y refresh token (scope `offline_access`).
- Tokens guardados **encriptados** en la base con `crypto` de Node (clave en `.env`). Renovación automática con el refresh token antes de que venzan.
- Desconectar: se borran los tokens; los movimientos importados quedan.
- Sincronizar: primera vez, últimos 5 días; después, desde la última sincronización. Sin duplicar: ID del pago de MP como ID externo (`UNIQUE` por usuario + fuente + ID externo).
- Mapeo: `money_transfer` → ingreso/egreso según payer/collector, con el ID de MP de la contraparte; `account_fund` (CVU) → ingreso sin persona; `partition_transfer` → `internal`.
- `movements`: `source` suma `'mp_api'`, `type` suma `'internal'` (no suma ni resta en saldo ni en ingresos/egresos), columnas nuevas de ID externo y ID de MP de la contraparte (`ALTER TABLE`).
- Movimientos de MP: se editan categoría y descripción, el monto no.
- La sincronización no pisa ediciones manuales.

**3c — App**
- Librería nueva: `expo-web-browser` (abrir el login de MP y volver a la app).
- Ajustes: conectar / desconectar Mercado Pago.
- Sincronizar al abrir la app y con pull to refresh en Inicio y Movimientos.
- Movimiento interno: gris, sin signo, descripción tipo "A reserva: Vacaciones" / "Desde reserva: Vacaciones".
- Pantallas nuevas (conectar MP en Ajustes, fila de movimiento interno): diseñarlas antes en Claude Design.

### Etapa 4 — Mails de MP en Gmail
Pagos con QR/tarjeta y transferencias a bancos. Alcance a definir antes de arrancar.

### Después de las pantallas principales
- **Face ID** (`expo-local-authentication`): pedirlo al abrir la app y al volver de segundo plano tras más de 1 minuto. La contraseña se pide solo si el token venció, se cerró sesión o falla Face ID. Requiere development build (Expo Go no soporta Face ID en iPhone).
- **Recuperar contraseña:** código de 6 dígitos por email, vence en 15 minutos. Columnas nuevas: `reset_code_hash`, `reset_code_expires_at` (con `ALTER TABLE`). Envío con Nodemailer + Gmail (contraseña de aplicación). Primero probar un mail desde Vercel: si el SMTP está bloqueado, pasar a un servicio por API.

### PWA provisoria (más adelante, después del deploy)
Para usar Capi en el iPhone sin Expo Go ni cuenta de Apple, hasta pasar a la app nativa con TestFlight/App Store.
- Versión web de la app (React Native Web) en Vercel. El back ya está en Vercel: la web llama a `/api` sin CORS, sirviéndola desde el mismo proyecto o con un rewrite de `/api` a https://capi-phi-sandy.vercel.app (como AnimalPiletas). Se define al armarla.
- En el iPhone: Safari → Compartir → Agregar a pantalla de inicio. Ícono, manifest y meta tags de iOS para pantalla completa.
- Token en web: `localStorage` (en nativo sigue `expo-secure-store`).
- **Todo el código de la versión web es PROVISORIO y se elimina al pasar a la app nativa.** Cada parte va marcada con el comentario `PROVISORIO-WEB` para encontrarla y borrarla.

## Fuentes de datos (investigado y probado con cuenta real, oct 2026)

### API de Mercado Pago
Probado con Access Token de producción de la aplicación "Capi" (Checkout API) contra `GET /v1/payments/search` y `GET /v1/payments/{id}`.

| Movimiento | ¿Aparece? | Datos |
|---|---|---|
| Ingreso desde cuenta MP | Sí | `operation_type: "money_transfer"`, `sub_type: "INTRA_PSP"`. Persona: `payer.id` (ID de usuario MP, fijo), `payer.identification` (CUIT), `payer.email`. Sin nombre. |
| Ingreso desde banco (CVU) | Sí, sin persona | `operation_type: "account_fund"`, `payment_method_id: "cvu"`, `sub_type: "INTER_PSP"`. El payer soy yo y `bank_info` viene en null. No se distingue un tercero de una cuenta propia. El detalle no trae más. |
| Egreso a cuenta MP | Sí | `payer_id` (yo) y `collector.id` (la otra persona), sin email ni CUIT. |
| Reservas | Sí | `operation_type: "partition_transfer"`, branch `"AM-to-POT"`, trae el nombre de la reserva. Movimiento interno. |
| Egreso a banco (CBU) | No | — |
| Pago con QR / tarjeta | No | — |

- Ingreso o egreso: si `collector_id` == yo → ingreso (persona en `payer.id`); si `payer_id` == yo → egreso (persona en `collector.id`).
- El ID de usuario MP de una persona es el mismo cuando me paga y cuando le pago.
- Retenciones (`charges_details`): a veces aparecen, pero se le cobran al que recibe.
- **Webhooks:** probado con webhook.site y el evento "Pagos". La simulación llega, pero mandar y recibir transferencias **no dispara ningún aviso**. Solo sirve para cobros hechos a través de una integración. → Se usa **polling**: el back consulta `/v1/payments/search` y guarda lo nuevo. La frecuencia (al abrir la app, cada X minutos, botón "actualizar") se define en la etapa 3.
- **Multiusuario:** OAuth de MP (botón "Conectar Mercado Pago"), sin auditoría ni costo.

### Mails de MP (Gmail)
- Llegan en egresos: "Tu pago fue aprobado" (comercio y monto) y "Ya enviamos tu transferencia" (nombre, entidad y número de cuenta del beneficiario).
- **No** llega mail cuando recibo plata (no se puede activar).
- Leer Gmail con OAuth usa un permiso "restringido":
  - **Producción sin verificar:** gratis, hasta 100 usuarios en total (incluido yo, cuenta para siempre: no se libera si alguien deja de usar la app). Cada usuario acepta una vez el aviso de "app no verificada" de Google (no se puede ocultar). El usuario 101 no puede conectar Gmail; el resto de la app le funciona.
  - **Modo Testing:** no conviene (lista de mails a mano y el permiso vence cada 7 días).
  - **Para vender (más de 100):** verificación de Google + auditoría CASA anual. Tier 2 con TAC Security, unos USD 540/año. Requiere política de privacidad.
  - El reenvío automático de mails también requiere permisos restringidos, así que no evita esto.

### Cobertura
- La API cubre ingresos, transferencias dentro de MP y reservas. Los mails cubren pagos QR/tarjeta y transferencias a bancos. Ninguna fuente sola alcanza.
- Queda manual: el efectivo y quién mandó los ingresos desde bancos (entran solos, sin persona).
- Rendimientos de MP: no aparecen en la API ni en los mails → **no se registran**.

## Tabla de movimientos (requisitos para el diseño)

- Soporta varias fuentes: manual, API de MP y, más adelante, mail.
- ID externo (ID del pago de MP o del mail) para no duplicar.
- Persona identificada por el **ID de usuario MP**. Los ingresos por CVU entran sin persona: el usuario la agrega a mano.

## Movimientos, reglas y sueldo (definido para más adelante)

- **Reglas por persona:** "si el movimiento viene de / va a *tal persona* → categoría *tal*". Se aplican automáticamente a los movimientos de MP que entren **desde que se crea la regla**; no se aplican a los viejos. Funcionan solo con contrapartes de MP (clave: ID de usuario MP).
- **Sueldo neto:** una categoría puede tener movimientos que suman y que restan. Transferencias de ciertas personas → "Sueldo" (suman); pagos a empleados → también "Sueldo" (restan). Sueldo = suma de la categoría. Los pagos a empleados nunca cuentan como gasto en los reportes.
- **Editar movimientos:** cualquier movimiento se puede editar a mano. Una edición manual tiene prioridad: ninguna regla la pisa.
  - Movimientos de MP: se edita categoría y descripción; el **monto no** (viene del banco).
  - Movimientos de efectivo: se edita todo.
- Por ahora los pagos a empleados son a cuentas de MP, así que entran por la API. Si en algún momento son a bancos, entrarían por los mails de Gmail.

## Pendientes

- Renovar el Access Token de MP (quedó expuesto en una captura).
- Borrar la URL de webhook.site de la configuración de webhooks de la aplicación "Capi" en MP.
- Antes de diseñar algo que dependa de Mercado Pago, verificar qué datos da realmente la API.
- **Antes de vender:** pasar Vercel de Hobby a Pro, y hacer que el rate limit funcione con varias instancias (hoy está en memoria y cada instancia de Vercel cuenta por separado).