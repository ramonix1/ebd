-- Usuarios (admin e professores)
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('admin', 'professor')),
  telefone VARCHAR(20),
  foto_perfil VARCHAR(255),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Turmas
CREATE TABLE turmas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  faixa_etaria VARCHAR(100),
  dia_semana VARCHAR(20) NOT NULL,
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  trimestre VARCHAR(20) NOT NULL CHECK (trimestre IN ('1', '2', '3', '4')),
  ano_letivo INTEGER NOT NULL,
  ativa BOOLEAN DEFAULT true,
  criada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Professores por Turma (relação muitos-para-muitos)
CREATE TABLE turma_professores (
  id SERIAL PRIMARY KEY,
  turma_id INTEGER NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  desde DATE NOT NULL,
  ativo BOOLEAN DEFAULT true,
  UNIQUE(turma_id, usuario_id)
);

-- Alunos
CREATE TABLE alunos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  data_nascimento DATE,
  responsavel VARCHAR(255),
  email_responsavel VARCHAR(255),
  telefone_responsavel VARCHAR(20),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matriculas (alunos por turma)
CREATE TABLE matriculas (
  id SERIAL PRIMARY KEY,
  aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  turma_id INTEGER NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  trimestre VARCHAR(20) NOT NULL CHECK (trimestre IN ('1', '2', '3', '4')),
  ano_letivo INTEGER NOT NULL,
  data_matricula DATE NOT NULL DEFAULT CURRENT_DATE,
  ativa BOOLEAN DEFAULT true,
  criada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(aluno_id, turma_id, trimestre, ano_letivo)
);

-- Frequencia
CREATE TABLE frequencia (
  id SERIAL PRIMARY KEY,
  aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  turma_id INTEGER NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  data_aula DATE NOT NULL,
  presente BOOLEAN NOT NULL,
  observacoes TEXT,
  registrado_por INTEGER NOT NULL REFERENCES usuarios(id),
  registrado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Uma única marcação de presença por aluno/turma/dia (idempotência da chamada)
  UNIQUE (aluno_id, turma_id, data_aula)
);

-- Índices para melhor performance
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_tipo ON usuarios(tipo);
CREATE INDEX idx_turmas_ativa ON turmas(ativa);
CREATE INDEX idx_turmas_ano_trimestre ON turmas(ano_letivo, trimestre);
CREATE INDEX idx_alunos_ativo ON alunos(ativo);
CREATE INDEX idx_matriculas_aluno ON matriculas(aluno_id);
CREATE INDEX idx_matriculas_turma ON matriculas(turma_id);
CREATE INDEX idx_matriculas_ativa ON matriculas(ativa);
CREATE INDEX idx_frequencia_aluno ON frequencia(aluno_id);
CREATE INDEX idx_frequencia_turma ON frequencia(turma_id);
CREATE INDEX idx_frequencia_data ON frequencia(data_aula);
CREATE INDEX idx_frequencia_turma_data ON frequencia(turma_id, data_aula);
CREATE INDEX idx_frequencia_registrado_por ON frequencia(registrado_por);
CREATE INDEX idx_turma_professores_turma ON turma_professores(turma_id);
CREATE INDEX idx_turma_professores_usuario ON turma_professores(usuario_id);
