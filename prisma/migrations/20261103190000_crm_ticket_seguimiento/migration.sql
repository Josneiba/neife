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
