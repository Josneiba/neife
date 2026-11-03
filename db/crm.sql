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

-- =====================================================================================
-- v2: agenda con horas, requisitos del caso, derivaciones con comisión, ubicación, avisos.
-- Todo es idempotente: se puede volver a aplicar sin riesgo sobre la v1 ya instalada.
-- =====================================================================================

-- Datos nuevos de la ficha (todo lo personal va cifrado, igual que el resto).
ALTER TABLE crm_personas ADD COLUMN IF NOT EXISTS direccion_enc         TEXT NOT NULL DEFAULT '';
ALTER TABLE crm_personas ADD COLUMN IF NOT EXISTS ubicacion_enc         TEXT NOT NULL DEFAULT '';  -- JSON {"lat":..,"lng":..} cifrado
ALTER TABLE crm_personas ADD COLUMN IF NOT EXISTS disponibilidad_enc    TEXT NOT NULL DEFAULT '';
ALTER TABLE crm_personas ADD COLUMN IF NOT EXISTS referido_por_enc      TEXT NOT NULL DEFAULT '';
ALTER TABLE crm_personas ADD COLUMN IF NOT EXISTS informe_visible       INTEGER NOT NULL DEFAULT 1;
ALTER TABLE crm_personas ADD COLUMN IF NOT EXISTS satisfaccion          INTEGER NOT NULL DEFAULT 0; -- 0 = sin opinión; 1 a 5
ALTER TABLE crm_personas ADD COLUMN IF NOT EXISTS satisfaccion_nota_enc TEXT NOT NULL DEFAULT '';

-- Citas: lo que ocurre en un día y hora (asesorías, reuniones, audiencias, contactos, eventos).
CREATE TABLE IF NOT EXISTS crm_citas (
  id             SERIAL PRIMARY KEY,
  abogado_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  persona_id     INTEGER REFERENCES crm_personas(id) ON DELETE CASCADE,
  tipo           TEXT NOT NULL CHECK (tipo IN ('asesoria','reunion','audiencia','contacto','evento')),
  titulo_enc     TEXT NOT NULL DEFAULT '',
  nota_enc       TEXT NOT NULL DEFAULT '',
  canal          TEXT NOT NULL DEFAULT '',
  fecha          TEXT NOT NULL,
  hora_ini       TEXT NOT NULL DEFAULT '09:00',
  hora_fin       TEXT NOT NULL DEFAULT '10:00',
  estado         TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','realizada','no_asistio','cancelada')),
  interaccion_id INTEGER REFERENCES crm_interacciones(id) ON DELETE SET NULL,
  creado_en      TEXT NOT NULL DEFAULT ahora()
);
CREATE INDEX IF NOT EXISTS idx_crm_citas ON crm_citas(abogado_id, fecha);
CREATE INDEX IF NOT EXISTS idx_crm_citas_persona ON crm_citas(persona_id);

-- Requisitos del caso: documentos por reunir, trámites y compromisos, con su estado.
CREATE TABLE IF NOT EXISTS crm_pasos (
  id          SERIAL PRIMARY KEY,
  abogado_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  persona_id  INTEGER NOT NULL REFERENCES crm_personas(id) ON DELETE CASCADE,
  texto_enc   TEXT NOT NULL,
  categoria   TEXT NOT NULL DEFAULT 'documento' CHECK (categoria IN ('documento','tramite','compromiso')),
  estado      TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_curso','listo','omitido')),
  vence       TEXT NOT NULL DEFAULT '',
  creado_en   TEXT NOT NULL DEFAULT ahora()
);
CREATE INDEX IF NOT EXISTS idx_crm_pasos ON crm_pasos(persona_id, estado);
CREATE INDEX IF NOT EXISTS idx_crm_pasos_abogado ON crm_pasos(abogado_id, estado);

-- Derivaciones: a qué colega reasignaste un caso, con qué comisión, cómo fue el trato y
-- si el cliente quedó conforme.
CREATE TABLE IF NOT EXISTS crm_derivaciones (
  id               SERIAL PRIMARY KEY,
  abogado_id       INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  persona_id       INTEGER NOT NULL REFERENCES crm_personas(id) ON DELETE CASCADE,
  colega_id        INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,   -- si el colega está en Neife
  colega_enc       TEXT NOT NULL,                                        -- nombre del colega (cifrado)
  contacto_enc     TEXT NOT NULL DEFAULT '',
  fecha            TEXT NOT NULL,
  motivo_enc       TEXT NOT NULL DEFAULT '',
  comision_tipo    TEXT NOT NULL DEFAULT 'ninguna' CHECK (comision_tipo IN ('ninguna','porcentaje','monto')),
  comision_valor   INTEGER NOT NULL DEFAULT 0,        -- % (0 a 100) o monto en pesos
  comision_estado  TEXT NOT NULL DEFAULT 'sin_acuerdo' CHECK (comision_estado IN ('sin_acuerdo','acordada','cobrada')),
  comision_cobrada INTEGER NOT NULL DEFAULT 0,        -- pesos efectivamente recibidos
  resultado        TEXT NOT NULL DEFAULT 'en_curso' CHECK (resultado IN ('en_curso','aceptado','rechazado','sin_respuesta','resuelto')),
  trato_enc        TEXT NOT NULL DEFAULT '',          -- cómo fue el trato con el colega
  satisfaccion     INTEGER NOT NULL DEFAULT 0,        -- conformidad del cliente con el colega (0 = sin dato; 1 a 5)
  creado_en        TEXT NOT NULL DEFAULT ahora(),
  actualizado_en   TEXT NOT NULL DEFAULT ahora()
);
CREATE INDEX IF NOT EXISTS idx_crm_deriv ON crm_derivaciones(abogado_id, fecha);
CREATE INDEX IF NOT EXISTS idx_crm_deriv_persona ON crm_derivaciones(persona_id);

-- Avisos que el abogado pospuso o descartó (las notificaciones se calculan solas, no se guardan).
CREATE TABLE IF NOT EXISTS crm_avisos_ocultos (
  abogado_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  clave       TEXT NOT NULL,
  hasta       TEXT NOT NULL,
  PRIMARY KEY (abogado_id, clave)
);

-- Notas de zona: apuntes por comuna (dónde hay juntas de vecinos, tribunales, clínicas jurídicas).
CREATE TABLE IF NOT EXISTS crm_zona_notas (
  id          SERIAL PRIMARY KEY,
  abogado_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  region      TEXT NOT NULL DEFAULT '',
  comuna      TEXT NOT NULL DEFAULT '',
  texto_enc   TEXT NOT NULL,
  creado_en   TEXT NOT NULL DEFAULT ahora()
);
CREATE INDEX IF NOT EXISTS idx_crm_zona_notas ON crm_zona_notas(abogado_id, comuna);

-- Seguridad: igual que el resto del esquema, activa RLS en las tablas crm_ (sin políticas,
-- las claves públicas de Supabase no pueden leer nada; la app entra con su conexión directa).
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename LIKE 'crm\_%' LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- v3: código de seguimiento único compartido entre la solicitud y su ficha de cliente.
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS codigo_seguimiento TEXT NOT NULL
  DEFAULT ('CASO-' || upper(replace(gen_random_uuid()::text, '-', '')));
CREATE UNIQUE INDEX IF NOT EXISTS idx_solicitudes_codigo_seguimiento ON solicitudes(codigo_seguimiento);

ALTER TABLE crm_personas ADD COLUMN IF NOT EXISTS codigo_seguimiento TEXT NOT NULL
  DEFAULT ('CRM-' || upper(replace(gen_random_uuid()::text, '-', '')));
UPDATE crm_personas p
SET codigo_seguimiento = CASE
  WHEN p.id = (SELECT min(p2.id) FROM crm_personas p2 WHERE p2.solicitud_id = p.solicitud_id)
    THEN s.codigo_seguimiento
  ELSE 'CRM-' || upper(replace(gen_random_uuid()::text, '-', ''))
END
FROM solicitudes s
WHERE p.solicitud_id = s.id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_personas_codigo_seguimiento ON crm_personas(codigo_seguimiento);

-- v4: códigos más cortos, agrupados para poder dictarlos y buscarlos sin guiones.
ALTER TABLE solicitudes ALTER COLUMN codigo_seguimiento SET DEFAULT (
  'CASO-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 4)) || '-' ||
  upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 4)) || '-' ||
  upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 4))
);
ALTER TABLE crm_personas ALTER COLUMN codigo_seguimiento SET DEFAULT (
  'CRM-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 4)) || '-' ||
  upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 4)) || '-' ||
  upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 4))
);

UPDATE solicitudes
SET codigo_seguimiento =
  'CASO-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 4)) || '-' ||
  upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 4)) || '-' ||
  upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 4));

WITH vinculadas AS (
  SELECT id, solicitud_id, row_number() OVER (PARTITION BY solicitud_id ORDER BY id) AS numero
  FROM crm_personas
  WHERE solicitud_id IS NOT NULL
)
UPDATE crm_personas p
SET codigo_seguimiento = s.codigo_seguimiento
FROM vinculadas v
JOIN solicitudes s ON s.id = v.solicitud_id
WHERE p.id = v.id AND v.numero = 1;

WITH vinculadas AS (
  SELECT id, row_number() OVER (PARTITION BY solicitud_id ORDER BY id) AS numero
  FROM crm_personas
  WHERE solicitud_id IS NOT NULL
)
UPDATE crm_personas p
SET codigo_seguimiento =
  'CRM-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 4)) || '-' ||
  upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 4)) || '-' ||
  upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 4))
WHERE NOT EXISTS (SELECT 1 FROM vinculadas v WHERE v.id = p.id AND v.numero = 1);
