-- Lote captación: dirección y honorarios del asesor, fecha del hecho, mandato propuesto/aceptado.
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS direccion  TEXT NOT NULL DEFAULT '';
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS honorarios TEXT NOT NULL DEFAULT '';
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS fecha_hecho       TEXT NOT NULL DEFAULT '';
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS mandato_propuesto TEXT NOT NULL DEFAULT '';
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS mandato_en        TEXT NOT NULL DEFAULT '';
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
