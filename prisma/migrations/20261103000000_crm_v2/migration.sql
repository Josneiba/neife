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
