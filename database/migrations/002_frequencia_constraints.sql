-- 002: Garante unicidade da frequência por (aluno, turma, dia) e índices de leitura.

-- Remove duplicatas existentes, mantendo o registro de maior id (mais recente).
DELETE FROM frequencia f
USING frequencia g
WHERE f.aluno_id = g.aluno_id
  AND f.turma_id = g.turma_id
  AND f.data_aula = g.data_aula
  AND f.id < g.id;

-- Constraint única (idempotente).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'frequencia_aluno_id_turma_id_data_aula_key'
  ) THEN
    ALTER TABLE frequencia
      ADD CONSTRAINT frequencia_aluno_id_turma_id_data_aula_key
      UNIQUE (aluno_id, turma_id, data_aula);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_frequencia_turma_data ON frequencia(turma_id, data_aula);
CREATE INDEX IF NOT EXISTS idx_frequencia_registrado_por ON frequencia(registrado_por);
