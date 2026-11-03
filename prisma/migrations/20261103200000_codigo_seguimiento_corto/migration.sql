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
