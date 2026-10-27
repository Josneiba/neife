-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

CREATE OR REPLACE FUNCTION ahora(dias integer DEFAULT 0) RETURNS text
LANGUAGE sql STABLE AS $$ SELECT to_char((now() AT TIME ZONE 'utc') + make_interval(days => dias), 'YYYY-MM-DD HH24:MI:SS') $$;

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "creado_en" TEXT NOT NULL DEFAULT ahora(),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfiles" (
    "usuario_id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL DEFAULT '',
    "registro" TEXT NOT NULL DEFAULT '',
    "materias" TEXT NOT NULL DEFAULT '',
    "ubicacion" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "precio_informe" INTEGER NOT NULL DEFAULT 3000,
    "instrucciones_pago" TEXT NOT NULL DEFAULT '',
    "publicado" INTEGER NOT NULL DEFAULT 1,
    "meta_semanal" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "perfiles_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "solicitudes" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "asesor_id" INTEGER NOT NULL,
    "cliente_id" INTEGER,
    "materia" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT '',
    "urgencia" TEXT NOT NULL DEFAULT 'normal',
    "presupuesto" TEXT NOT NULL DEFAULT '',
    "relato_enc" TEXT NOT NULL,
    "nombre_enc" TEXT NOT NULL,
    "email_enc" TEXT NOT NULL,
    "telefono_enc" TEXT NOT NULL DEFAULT '',
    "estado" TEXT NOT NULL DEFAULT 'nueva',
    "motivo_rechazo" TEXT NOT NULL DEFAULT '',
    "derivar_ok" INTEGER NOT NULL DEFAULT 0,
    "abogado_destino_enc" TEXT NOT NULL DEFAULT '',
    "abogado_confirmado" INTEGER NOT NULL DEFAULT 0,
    "proximo_contacto" TEXT NOT NULL DEFAULT '',
    "resultado" TEXT NOT NULL DEFAULT '',
    "origen" TEXT NOT NULL DEFAULT 'web',
    "conservar_datos" INTEGER NOT NULL DEFAULT 0,
    "anonimizada_en" TEXT NOT NULL DEFAULT '',
    "creado_en" TEXT NOT NULL DEFAULT ahora(),
    "actualizado_en" TEXT NOT NULL DEFAULT ahora(),

    CONSTRAINT "solicitudes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "informes" (
    "id" SERIAL NOT NULL,
    "solicitud_id" INTEGER NOT NULL,
    "asesor_id" INTEGER NOT NULL,
    "contenido_enc" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "entregado" INTEGER NOT NULL DEFAULT 0,
    "creado_en" TEXT NOT NULL DEFAULT ahora(),
    "actualizado_en" TEXT NOT NULL DEFAULT ahora(),

    CONSTRAINT "informes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pendientes" (
    "id" SERIAL NOT NULL,
    "solicitud_id" INTEGER NOT NULL,
    "texto_enc" TEXT NOT NULL,
    "hecho" INTEGER NOT NULL DEFAULT 0,
    "creado_en" TEXT NOT NULL DEFAULT ahora(),

    CONSTRAINT "pendientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seguimiento" (
    "id" SERIAL NOT NULL,
    "solicitud_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "texto_enc" TEXT NOT NULL,
    "creado_en" TEXT NOT NULL DEFAULT ahora(),

    CONSTRAINT "seguimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "normas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "materia" TEXT NOT NULL,
    "fuente" TEXT NOT NULL DEFAULT '',
    "archivo" TEXT NOT NULL DEFAULT '',
    "bcn_id" TEXT NOT NULL DEFAULT '',
    "version" TEXT NOT NULL DEFAULT '',
    "subido_por" INTEGER,
    "creado_en" TEXT NOT NULL DEFAULT ahora(),
    "revisada_en" TEXT NOT NULL DEFAULT '',
    "modo" TEXT NOT NULL DEFAULT 'articulos',
    "error_revision" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "normas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articulos" (
    "id" SERIAL NOT NULL,
    "norma_id" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "busqueda" TEXT NOT NULL DEFAULT '',
    "busqueda_tsv" tsvector GENERATED ALWAYS AS (to_tsvector('simple', "busqueda")) STORED,

    CONSTRAINT "articulos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL DEFAULT '',
    "entidad_id" INTEGER,
    "creado_en" TEXT NOT NULL DEFAULT ahora(),

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "limites" (
    "clave" TEXT NOT NULL,
    "cuenta" INTEGER NOT NULL,
    "hasta" BIGINT NOT NULL,

    CONSTRAINT "limites_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "tokens" (
    "hash" TEXT NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "vence" BIGINT NOT NULL,
    "usado" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "identidades" (
    "proveedor" TEXT NOT NULL,
    "sub" TEXT NOT NULL,
    "usuario_id" INTEGER NOT NULL,

    CONSTRAINT "identidades_pkey" PRIMARY KEY ("proveedor","sub")
);

-- CreateTable
CREATE TABLE "meta" (
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "meta_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "consultas_log" (
    "id" SERIAL NOT NULL,
    "materia" TEXT NOT NULL,
    "resultados" INTEGER NOT NULL,
    "creado_en" TEXT NOT NULL DEFAULT ahora(),

    CONSTRAINT "consultas_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" SERIAL NOT NULL,
    "solicitud_id" INTEGER NOT NULL,
    "asesor_id" INTEGER NOT NULL,
    "nombre_enc" TEXT NOT NULL,
    "resultado_enc" TEXT NOT NULL,
    "pasado" INTEGER NOT NULL DEFAULT 0,
    "creado_en" TEXT NOT NULL DEFAULT ahora(),

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "perfiles_slug_key" ON "perfiles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_codigo_key" ON "solicitudes"("codigo");

-- CreateIndex
CREATE INDEX "idx_solicitudes_asesor" ON "solicitudes"("asesor_id", "estado");

-- CreateIndex
CREATE INDEX "idx_solicitudes_cliente" ON "solicitudes"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "informes_solicitud_id_key" ON "informes"("solicitud_id");

-- CreateIndex
CREATE INDEX "idx_pendientes_solicitud" ON "pendientes"("solicitud_id");

-- CreateIndex
CREATE INDEX "idx_seguimiento_solicitud" ON "seguimiento"("solicitud_id");

-- CreateIndex
CREATE INDEX "idx_articulos_norma" ON "articulos"("norma_id");

CREATE INDEX "idx_articulos_tsv" ON "articulos" USING GIN ("busqueda_tsv");

-- CreateIndex
CREATE INDEX "idx_consultas_log_fecha" ON "consultas_log"("creado_en");

-- CreateIndex
CREATE INDEX "idx_documentos_solicitud" ON "documentos"("solicitud_id");

-- AddForeignKey
ALTER TABLE "perfiles" ADD CONSTRAINT "perfiles_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_asesor_id_fkey" FOREIGN KEY ("asesor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "informes" ADD CONSTRAINT "informes_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "informes" ADD CONSTRAINT "informes_asesor_id_fkey" FOREIGN KEY ("asesor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendientes" ADD CONSTRAINT "pendientes_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimiento" ADD CONSTRAINT "seguimiento_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "normas" ADD CONSTRAINT "normas_subido_por_fkey" FOREIGN KEY ("subido_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articulos" ADD CONSTRAINT "articulos_norma_id_fkey" FOREIGN KEY ("norma_id") REFERENCES "normas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identidades" ADD CONSTRAINT "identidades_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_asesor_id_fkey" FOREIGN KEY ("asesor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_check" CHECK ("rol" IN ('cliente', 'abogado', 'admin'));
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_estado_check" CHECK ("estado" IN ('activo', 'pendiente', 'rechazado'));
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_estado_check" CHECK ("estado" IN ('nueva', 'aceptada', 'informe', 'entregada', 'derivada', 'cerrada', 'rechazada'));
ALTER TABLE "informes" ADD CONSTRAINT "informes_estado_check" CHECK ("estado" IN ('borrador', 'final'));
ALTER TABLE "seguimiento" ADD CONSTRAINT "seguimiento_tipo_check" CHECK ("tipo" IN ('etapa', 'nota'));

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = current_schema() LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
