-- 004: Guarda a foto de perfil no banco (disco do Render é efêmero).
-- foto_perfil passa a conter a URL da rota autenticada (/perfil/foto?v=...),
-- servida a partir de foto_dados/foto_mime.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_dados BYTEA;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_mime VARCHAR(50);

-- Caminhos antigos em disco (/uploads/perfis/...) não existem mais após o deploy.
UPDATE usuarios
SET foto_perfil = NULL
WHERE foto_dados IS NULL AND foto_perfil LIKE '/uploads/%';
