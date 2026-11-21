-- Versiona las sesiones para revocarlas al cambiar la contraseña o los privilegios de una cuenta.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS sesion_version INTEGER NOT NULL DEFAULT 0;
