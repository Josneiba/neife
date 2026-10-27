-- Esquema heredado aplicado antes de la adopción de Prisma Migrate.
CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol           TEXT NOT NULL CHECK (rol IN ('cliente','abogado','admin')),
  nombre        TEXT NOT NULL,
  estado        TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','pendiente','rechazado')),
  creado_en     TEXT NOT NULL DEFAULT ahora()
);

CREATE TABLE IF NOT EXISTS perfiles (
  usuario_id         INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  slug               TEXT NOT NULL UNIQUE,
  titulo             TEXT NOT NULL DEFAULT '',
  registro           TEXT NOT NULL DEFAULT '',
  materias           TEXT NOT NULL DEFAULT '',
  ubicacion          TEXT NOT NULL DEFAULT '',
  bio                TEXT NOT NULL DEFAULT '',
  precio_informe     INTEGER NOT NULL DEFAULT 3000,
  instrucciones_pago TEXT NOT NULL DEFAULT '',
  publicado          INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS solicitudes (
  id             SERIAL PRIMARY KEY,
  codigo         TEXT NOT NULL UNIQUE,
  asesor_id      INTEGER NOT NULL REFERENCES usuarios(id),
  cliente_id     INTEGER REFERENCES usuarios(id),
  materia        TEXT NOT NULL,
  region         TEXT NOT NULL DEFAULT '',
  urgencia       TEXT NOT NULL DEFAULT 'normal',
  presupuesto    TEXT NOT NULL DEFAULT '',
  relato_enc     TEXT NOT NULL,
  nombre_enc     TEXT NOT NULL,
  email_enc      TEXT NOT NULL,
  telefono_enc   TEXT NOT NULL DEFAULT '',
  estado         TEXT NOT NULL DEFAULT 'nueva' CHECK (estado IN ('nueva','aceptada','informe','entregada','derivada','cerrada','rechazada')),
  motivo_rechazo TEXT NOT NULL DEFAULT '',
  derivar_ok     INTEGER NOT NULL DEFAULT 0,
  abogado_destino_enc TEXT NOT NULL DEFAULT '',
  abogado_confirmado  INTEGER NOT NULL DEFAULT 0,
  proximo_contacto    TEXT NOT NULL DEFAULT '',
  resultado      TEXT NOT NULL DEFAULT '',
  origen         TEXT NOT NULL DEFAULT 'web',
  conservar_datos INTEGER NOT NULL DEFAULT 0,
  anonimizada_en TEXT NOT NULL DEFAULT '',
  creado_en      TEXT NOT NULL DEFAULT ahora(),
  actualizado_en TEXT NOT NULL DEFAULT ahora()
);
CREATE INDEX IF NOT EXISTS idx_solicitudes_asesor ON solicitudes(asesor_id, estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_cliente ON solicitudes(cliente_id);

CREATE TABLE IF NOT EXISTS informes (
  id             SERIAL PRIMARY KEY,
  solicitud_id   INTEGER NOT NULL UNIQUE REFERENCES solicitudes(id) ON DELETE CASCADE,
  asesor_id      INTEGER NOT NULL REFERENCES usuarios(id),
  contenido_enc  TEXT NOT NULL,
  estado         TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','final')),
  entregado      INTEGER NOT NULL DEFAULT 0,
  creado_en      TEXT NOT NULL DEFAULT ahora(),
  actualizado_en TEXT NOT NULL DEFAULT ahora()
);

CREATE TABLE IF NOT EXISTS pendientes (
  id           SERIAL PRIMARY KEY,
  solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
  texto_enc    TEXT NOT NULL,
  hecho        INTEGER NOT NULL DEFAULT 0,
  creado_en    TEXT NOT NULL DEFAULT ahora()
);
CREATE INDEX IF NOT EXISTS idx_pendientes_solicitud ON pendientes(solicitud_id);

CREATE TABLE IF NOT EXISTS seguimiento (
  id           SERIAL PRIMARY KEY,
  solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
  tipo         TEXT NOT NULL CHECK (tipo IN ('etapa','nota')),
  texto_enc    TEXT NOT NULL,
  creado_en    TEXT NOT NULL DEFAULT ahora()
);
CREATE INDEX IF NOT EXISTS idx_seguimiento_solicitud ON seguimiento(solicitud_id);

CREATE TABLE IF NOT EXISTS normas (
  id             SERIAL PRIMARY KEY,
  nombre         TEXT NOT NULL,
  materia        TEXT NOT NULL,
  fuente         TEXT NOT NULL DEFAULT '',
  archivo        TEXT NOT NULL DEFAULT '',
  bcn_id         TEXT NOT NULL DEFAULT '',
  version        TEXT NOT NULL DEFAULT '',
  subido_por     INTEGER REFERENCES usuarios(id),
  creado_en      TEXT NOT NULL DEFAULT ahora()
);

CREATE TABLE IF NOT EXISTS articulos (
  id        SERIAL PRIMARY KEY,
  norma_id  INTEGER NOT NULL REFERENCES normas(id) ON DELETE CASCADE,
  numero    TEXT NOT NULL,
  texto     TEXT NOT NULL,
  busqueda  TEXT NOT NULL DEFAULT '',
  busqueda_tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', busqueda)) STORED
);
CREATE INDEX IF NOT EXISTS idx_articulos_tsv ON articulos USING GIN (busqueda_tsv);
CREATE INDEX IF NOT EXISTS idx_articulos_norma ON articulos(norma_id);


CREATE TABLE IF NOT EXISTS auditoria (
  id         SERIAL PRIMARY KEY,
  usuario_id INTEGER,
  accion     TEXT NOT NULL,
  entidad    TEXT NOT NULL DEFAULT '',
  entidad_id INTEGER,
  creado_en  TEXT NOT NULL DEFAULT ahora()
);

-- Límite de intentos compartido entre instancias (Vercel no comparte memoria).
CREATE TABLE IF NOT EXISTS limites (
  clave TEXT PRIMARY KEY,
  cuenta INTEGER NOT NULL,
  hasta BIGINT NOT NULL
);

-- Enlaces de un solo uso: recuperar contraseña.
CREATE TABLE IF NOT EXISTS tokens (
  hash       TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo       TEXT NOT NULL,
  vence      BIGINT NOT NULL,
  usado      INTEGER NOT NULL DEFAULT 0
);

-- Ingreso con Google (u otro proveedor).
CREATE TABLE IF NOT EXISTS identidades (
  proveedor  TEXT NOT NULL,
  sub        TEXT NOT NULL,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  PRIMARY KEY (proveedor, sub)
);

CREATE TABLE IF NOT EXISTS meta (clave TEXT PRIMARY KEY, valor TEXT NOT NULL);

-- Consultas de la gente a la biblioteca: SOLO materia y cuántas normas se encontraron (nunca el texto).
-- Sirve para saber qué leyes faltan.
CREATE TABLE IF NOT EXISTS consultas_log (
  id         SERIAL PRIMARY KEY,
  materia    TEXT NOT NULL,
  resultados INTEGER NOT NULL,
  creado_en  TEXT NOT NULL DEFAULT ahora()
);
CREATE INDEX IF NOT EXISTS idx_consultas_log_fecha ON consultas_log(creado_en);

-- Documentos que el abogado lee en una ficha. NO se guarda el archivo: solo el nombre y lo extraído, cifrados.
CREATE TABLE IF NOT EXISTS documentos (
  id            SERIAL PRIMARY KEY,
  solicitud_id  INTEGER NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
  asesor_id     INTEGER NOT NULL REFERENCES usuarios(id),
  nombre_enc    TEXT NOT NULL,
  resultado_enc TEXT NOT NULL,
  pasado        INTEGER NOT NULL DEFAULT 0,
  creado_en     TEXT NOT NULL DEFAULT ahora()
);
CREATE INDEX IF NOT EXISTS idx_documentos_solicitud ON documentos(solicitud_id);

-- Para bases creadas con una versión anterior.
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS meta_semanal INTEGER NOT NULL DEFAULT 3;
ALTER TABLE normas ADD COLUMN IF NOT EXISTS revisada_en TEXT NOT NULL DEFAULT '';
ALTER TABLE normas ADD COLUMN IF NOT EXISTS modo TEXT NOT NULL DEFAULT 'articulos';
ALTER TABLE normas ADD COLUMN IF NOT EXISTS error_revision TEXT NOT NULL DEFAULT '';
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'web';

-- Seguridad: Supabase expone el esquema "public" por su API REST. Con RLS activado y sin políticas,
-- las claves públicas (anon / authenticated) no pueden leer nada. La app entra con su conexión directa.
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS conservar_datos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS anonimizada_en TEXT NOT NULL DEFAULT '';

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = current_schema() LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
