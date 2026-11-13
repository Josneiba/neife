-- Deja las solicitudes sin asignar disponibles en la bandeja compartida.
ALTER TABLE "solicitudes" ALTER COLUMN "asesor_id" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_solicitudes_abiertas"
  ON "solicitudes" ("creado_en" DESC)
  WHERE "asesor_id" IS NULL AND "estado" = 'nueva';
