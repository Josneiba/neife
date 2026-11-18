CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION neife_codigo_corto() RETURNS text AS $$
DECLARE
  alfabeto text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  bytes bytea := gen_random_bytes(8);
  resultado text := '';
  i int;
BEGIN
  FOR i IN 0..7 LOOP
    resultado := resultado || substr(alfabeto, (get_byte(bytes, i) % length(alfabeto)) + 1, 1);
    IF i = 3 THEN resultado := resultado || '-'; END IF;
  END LOOP;
  RETURN resultado;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE solicitudes
  ALTER COLUMN codigo_seguimiento SET DEFAULT neife_codigo_corto();

-- No se reescriben los códigos ya entregados: los enlaces/correos existentes siguen siendo válidos.
-- Los códigos CASO-... se aceptan como entrada en /seguir durante la transición.

ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS contraparte_enc TEXT NOT NULL DEFAULT '';
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS email_hash TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_solicitudes_email_hash
  ON solicitudes (email_hash) WHERE email_hash <> '' AND email_hash <> 'invalido';

ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS verificado_en TEXT NOT NULL DEFAULT '';
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS verificacion_nota TEXT NOT NULL DEFAULT '';
UPDATE perfiles
   SET verificado_en = ahora(), verificacion_nota = 'previo'
 WHERE verificado_en = ''
   AND usuario_id IN (SELECT id FROM usuarios WHERE rol = 'abogado' AND estado = 'activo');
