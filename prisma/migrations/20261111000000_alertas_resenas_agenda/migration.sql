ALTER TABLE "perfiles" ADD COLUMN IF NOT EXISTS "alertas" TEXT NOT NULL DEFAULT '';
ALTER TABLE "perfiles" ADD COLUMN IF NOT EXISTS "horario" TEXT NOT NULL DEFAULT '';
ALTER TABLE "solicitudes" ADD COLUMN IF NOT EXISTS "tomada_en" TEXT NOT NULL DEFAULT '';
ALTER TABLE "solicitudes" ADD COLUMN IF NOT EXISTS "ultimo_aviso" TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "resenas" (
  "id" SERIAL PRIMARY KEY,
  "asesor_id" INTEGER NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "solicitud_id" INTEGER UNIQUE REFERENCES "solicitudes"("id") ON DELETE SET NULL,
  "estrellas" INTEGER NOT NULL CHECK ("estrellas" BETWEEN 1 AND 5),
  "comentario" TEXT NOT NULL DEFAULT '',
  "publicada" INTEGER NOT NULL DEFAULT 1,
  "creado_en" TEXT NOT NULL DEFAULT ahora()
);

CREATE INDEX IF NOT EXISTS "idx_resenas_asesor" ON "resenas" ("asesor_id");
