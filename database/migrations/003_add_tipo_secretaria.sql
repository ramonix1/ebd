-- 003: Adiciona o perfil 'secretaria' ao CHECK de usuarios.tipo.
-- O nome da constraint pode ter sido gerado automaticamente (usuarios_tipo_check),
-- então removemos qualquer CHECK de usuarios que referencie a coluna "tipo".
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'usuarios'::regclass
      AND c.contype = 'c'
      AND a.attname = 'tipo'
  LOOP
    EXECUTE format('ALTER TABLE usuarios DROP CONSTRAINT %I', r.conname);
  END LOOP;

  ALTER TABLE usuarios
    ADD CONSTRAINT usuarios_tipo_check
    CHECK (tipo IN ('admin', 'professor', 'secretaria'));
END $$;
