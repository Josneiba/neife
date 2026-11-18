-- Hilo de mensajes entre la persona y su asesor, dentro de cada caso.
CREATE TABLE IF NOT EXISTS mensajes (
  id           SERIAL PRIMARY KEY,
  solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
  de           TEXT NOT NULL CHECK (de IN ('persona', 'asesor')),
  texto_enc    TEXT NOT NULL,
  creado_en    TEXT NOT NULL DEFAULT ahora(),
  leido_en     TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_mensajes_solicitud ON mensajes (solicitud_id, id);
ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;
