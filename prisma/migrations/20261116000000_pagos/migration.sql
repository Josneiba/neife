-- Pagos por transferencia: cuenta de depósito del asesor (cifrada) y cobros por caso.
-- No se guardan números de tarjeta: el cobro es una transferencia directa al asesor.
CREATE TABLE IF NOT EXISTS cuentas_deposito (
  usuario_id     INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  banco          TEXT NOT NULL,
  tipo           TEXT NOT NULL,
  numero_enc     TEXT NOT NULL,
  rut_enc        TEXT NOT NULL,
  titular_enc    TEXT NOT NULL,
  correo_enc     TEXT NOT NULL DEFAULT '',
  actualizado_en TEXT NOT NULL DEFAULT ahora()
);

CREATE TABLE IF NOT EXISTS cobros (
  id                  SERIAL PRIMARY KEY,
  solicitud_id        INTEGER NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
  asesor_id           INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  concepto            TEXT NOT NULL,
  monto               INTEGER NOT NULL CHECK (monto > 0 AND monto <= 100000000),
  estado              TEXT NOT NULL DEFAULT 'pendiente',
  operacion_enc       TEXT NOT NULL DEFAULT '',
  fecha_transferencia TEXT NOT NULL DEFAULT '',
  creado_en           TEXT NOT NULL DEFAULT ahora(),
  aviso_en            TEXT NOT NULL DEFAULT '',
  pagado_en           TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_cobros_solicitud ON cobros (solicitud_id);
CREATE INDEX IF NOT EXISTS idx_cobros_asesor ON cobros (asesor_id, estado);

ALTER TABLE public.cuentas_deposito ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobros ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.cuentas_deposito, public.cobros FROM anon, authenticated;
