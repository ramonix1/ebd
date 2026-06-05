-- 001: Adiciona campos de telefone e foto de perfil aos usuários.
-- Já usados em professorController e perfilController, mas ausentes no schema original.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_perfil VARCHAR(255);
