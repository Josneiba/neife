-- =====================================================================================
-- Neife CRM · módulo de seguimiento de clientes, indicadores y metas para abogados.
-- Todas las tablas llevan el prefijo crm_ y se aplican solas (idempotente).
-- Los datos personales (nombre, teléfono, correo, notas) van CIFRADOS (columnas *_enc),
-- igual que en «solicitudes».
-- =====================================================================================

-- Personas: clientes y prospectos del abogado (el «Personen» de la referencia).
CREATE TABLE IF NOT EXISTS crm_personas (
  id               SERIAL PRIMARY KEY,
  abogado_id       INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  solicitud_id     INTEGER REFERENCES solicitudes(id) ON DELETE SET NULL,
  nombre_enc       TEXT NOT NULL,
  telefono_enc     TEXT NOT NULL DEFAULT '',
  email_enc        TEXT NOT NULL DEFAULT '',
  nota_enc         TEXT NOT NULL DEFAULT '',
  tipo             TEXT NOT NULL DEFAULT 'natural' CHECK (tipo IN ('natural','empresa')),
  materia          TEXT NOT NULL DEFAULT 'otra',
  region           TEXT NOT NULL DEFAULT '',
  comuna           TEXT NOT NULL DEFAULT '',
  origen           TEXT NOT NULL DEFAULT 'otro',
  etapa            TEXT NOT NULL DEFAULT 'prospecto'
                   CHECK (etapa IN ('prospecto','contactado','en_asesoria','con_hito','mandato','derivado','cerrado','perdido')),
  prioritario      INTEGER NOT NULL DEFAULT 0,
  fecha_hito       TEXT NOT NULL DEFAULT '',
  tipo_hito        TEXT NOT NULL DEFAULT '',
  proximo_contacto TEXT NOT NULL DEFAULT '',
  ultima_asesoria  TEXT NOT NULL DEFAULT '',
  abogado_destino_enc TEXT NOT NULL DEFAULT '',
  valor_estimado   INTEGER NOT NULL DEFAULT 0,
  creado_en        TEXT NOT NULL DEFAULT ahora(),
  actualizado_en   TEXT NOT NULL DEFAULT ahora()
);
CREATE INDEX IF NOT EXISTS idx_crm_personas_abogado ON crm_personas(abogado_id, etapa);
CREATE INDEX IF NOT EXISTS idx_crm_personas_hito ON crm_personas(abogado_id, fecha_hito);

-- Interacciones: contactos, asesorías, reuniones, audiencias y notas (el detalle humano).
CREATE TABLE IF NOT EXISTS crm_interacciones (
  id           SERIAL PRIMARY KEY,
  abogado_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  persona_id   INTEGER NOT NULL REFERENCES crm_personas(id) ON DELETE CASCADE,
  tipo         TEXT NOT NULL CHECK (tipo IN ('contacto','asesoria','reunion','audiencia','nota')),
  canal        TEXT NOT NULL DEFAULT '',
  fecha        TEXT NOT NULL,
  con_colega   INTEGER NOT NULL DEFAULT 0,   -- asesoría con abogado supervisor o colega presente
  nota_enc     TEXT NOT NULL DEFAULT '',
  creado_en    TEXT NOT NULL DEFAULT ahora()
);
CREATE INDEX IF NOT EXISTS idx_crm_inter_persona ON crm_interacciones(persona_id, fecha);
CREATE INDEX IF NOT EXISTS idx_crm_inter_abogado ON crm_interacciones(abogado_id, fecha);

-- Libro de eventos: cada cosa medible que pasa queda aquí. Los indicadores se calculan
-- contando estas filas (nunca hay contadores guardados que se puedan desfasar).
CREATE TABLE IF NOT EXISTS crm_eventos (
  id          SERIAL PRIMARY KEY,
  abogado_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  persona_id  INTEGER REFERENCES crm_personas(id) ON DELETE CASCADE,
  interaccion_id INTEGER REFERENCES crm_interacciones(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,
  fecha       TEXT NOT NULL,                 -- día local (America/Santiago) YYYY-MM-DD
  detalle     TEXT NOT NULL DEFAULT '',
  creado_en   TEXT NOT NULL DEFAULT ahora()
);
CREATE INDEX IF NOT EXISTS idx_crm_eventos_medida ON crm_eventos(abogado_id, tipo, fecha);
CREATE INDEX IF NOT EXISTS idx_crm_eventos_persona ON crm_eventos(persona_id);

-- Metas: un objetivo por indicador y período. Rige la meta más reciente con inicio <= período.
CREATE TABLE IF NOT EXISTS crm_metas (
  id          SERIAL PRIMARY KEY,
  abogado_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  metrica     TEXT NOT NULL,
  periodo     TEXT NOT NULL CHECK (periodo IN ('dia','semana','mes')),
  inicio      TEXT NOT NULL,                 -- primer día del período (o 1970-01-01 = valor base)
  objetivo    INTEGER NOT NULL CHECK (objetivo >= 0),
  UNIQUE (abogado_id, metrica, periodo, inicio)
);

-- Tareas (el «Aufgaben»).
CREATE TABLE IF NOT EXISTS crm_tareas (
  id          SERIAL PRIMARY KEY,
  abogado_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  persona_id  INTEGER REFERENCES crm_personas(id) ON DELETE CASCADE,
  texto_enc   TEXT NOT NULL,
  vence       TEXT NOT NULL DEFAULT '',
  hecha       INTEGER NOT NULL DEFAULT 0,
  creado_en   TEXT NOT NULL DEFAULT ahora()
);
CREATE INDEX IF NOT EXISTS idx_crm_tareas ON crm_tareas(abogado_id, hecha, vence);

-- Grupos o listas (el «Gruppen»): segmentos propios del abogado.
CREATE TABLE IF NOT EXISTS crm_grupos (
  id          SERIAL PRIMARY KEY,
  abogado_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  orden       INTEGER NOT NULL DEFAULT 0,
  UNIQUE (abogado_id, nombre)
);
CREATE TABLE IF NOT EXISTS crm_grupo_personas (
  grupo_id    INTEGER NOT NULL REFERENCES crm_grupos(id) ON DELETE CASCADE,
  persona_id  INTEGER NOT NULL REFERENCES crm_personas(id) ON DELETE CASCADE,
  PRIMARY KEY (grupo_id, persona_id)
);

-- Plan semanal / «Pläne zum Finden»: a quién y dónde buscar clientes cada día.
CREATE TABLE IF NOT EXISTS crm_planes (
  id          SERIAL PRIMARY KEY,
  abogado_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  persona_id  INTEGER REFERENCES crm_personas(id) ON DELETE CASCADE,
  fuente      TEXT NOT NULL CHECK (fuente IN ('asesorias','antiguos','red','actividades','interesados')),
  fecha       TEXT NOT NULL,
  texto_enc   TEXT NOT NULL DEFAULT '',
  hecho       INTEGER NOT NULL DEFAULT 0,
  creado_en   TEXT NOT NULL DEFAULT ahora()
);
CREATE INDEX IF NOT EXISTS idx_crm_planes ON crm_planes(abogado_id, fecha);

-- Seguridad: igual que el resto del esquema, activa RLS en las tablas crm_ (sin políticas,
-- las claves públicas de Supabase no pueden leer nada; la app entra con su conexión directa).
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename LIKE 'crm\_%' LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
