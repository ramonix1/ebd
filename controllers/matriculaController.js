const pool = require('../config/db');
const { asyncHandler, httpError } = require('../middleware/asyncHandler');

const listarPorTurma = asyncHandler(async (req, res) => {
  const { turmaId } = req.params;

  const turmaResult = await pool.query(
    'SELECT id, nome, dia_semana, horario_inicio, horario_fim, trimestre, ano_letivo, ativa FROM turmas WHERE id = $1',
    [turmaId]
  );
  if (turmaResult.rows.length === 0) {
    throw httpError(404, 'Turma não encontrada');
  }
  const turma = turmaResult.rows[0];

  const [matriculadosResult, disponiveisResult] = await Promise.all([
    pool.query(
      `SELECT a.id, a.nome FROM alunos a
       INNER JOIN matriculas m ON a.id = m.aluno_id
       WHERE m.turma_id = $1 AND m.ativa = true AND a.ativo = true
       ORDER BY a.nome ASC`,
      [turmaId]
    ),
    // Alunos não matriculados em nenhuma turma deste trimestre/ano letivo
    pool.query(
      `SELECT a.id, a.nome FROM alunos a
       WHERE a.ativo = true
       AND a.id NOT IN (
         SELECT m.aluno_id FROM matriculas m
         INNER JOIN turmas t ON m.turma_id = t.id
         WHERE m.ativa = true AND t.trimestre = $1 AND t.ano_letivo = $2
       )
       ORDER BY a.nome ASC`,
      [turma.trimestre, turma.ano_letivo]
    ),
  ]);

  res.render('admin/matriculas/lista', {
    titulo: 'Matrículas',
    turma,
    matriculados: matriculadosResult.rows,
    disponiveis: disponiveisResult.rows,
  });
});

const adicionarAluno = asyncHandler(async (req, res) => {
  const { turmaId } = req.params;
  const { alunoId } = req.body;

  const turmaResult = await pool.query(
    'SELECT id, trimestre, ano_letivo FROM turmas WHERE id = $1',
    [turmaId]
  );
  if (turmaResult.rows.length === 0) {
    throw httpError(404, 'Turma não encontrada');
  }
  const turma = turmaResult.rows[0];

  // A matrícula é única por (aluno, turma, trimestre, ano_letivo). Usamos a chave
  // completa para evitar reativar a linha errada quando há matrículas do mesmo
  // aluno na mesma turma em trimestres diferentes.
  await pool.query(
    `INSERT INTO matriculas (aluno_id, turma_id, trimestre, ano_letivo, data_matricula, ativa)
     VALUES ($1, $2, $3, $4, CURRENT_DATE, true)
     ON CONFLICT (aluno_id, turma_id, trimestre, ano_letivo)
     DO UPDATE SET ativa = true, data_matricula = CURRENT_DATE, atualizada_em = NOW()`,
    [alunoId, turmaId, turma.trimestre, turma.ano_letivo]
  );

  req.flash('sucesso');
  res.redirect(`/admin/turmas/${turmaId}/matriculas`);
});

const removerAluno = asyncHandler(async (req, res) => {
  const { turmaId } = req.params;
  const { alunoId } = req.body;

  // Soft delete - desativa matrícula
  await pool.query(
    'UPDATE matriculas SET ativa = false, atualizada_em = NOW() WHERE turma_id = $1 AND aluno_id = $2 AND ativa = true',
    [turmaId, alunoId]
  );

  req.flash('sucesso');
  res.redirect(`/admin/turmas/${turmaId}/matriculas`);
});

const toggleAlunoStatus = asyncHandler(async (req, res) => {
  const { turmaId, alunoId } = req.params;

  // Get current status
  const result = await pool.query(
    'SELECT ativa FROM matriculas WHERE turma_id = $1 AND aluno_id = $2',
    [turmaId, alunoId]
  );

  if (result.rows.length === 0) {
    throw httpError(404, 'Matrícula não encontrada');
  }

  const novoStatus = !result.rows[0].ativa;

  // Toggle status
  await pool.query(
    'UPDATE matriculas SET ativa = $1, atualizada_em = NOW() WHERE turma_id = $2 AND aluno_id = $3',
    [novoStatus, turmaId, alunoId]
  );

  req.flash('sucesso');
  res.redirect(`/admin/turmas/${turmaId}/alunos`);
});

const listarAlunosDaTurma = asyncHandler(async (req, res) => {
  const { turmaId } = req.params;

  const turmaResult = await pool.query('SELECT * FROM turmas WHERE id = $1', [turmaId]);
  if (turmaResult.rows.length === 0) {
    throw httpError(404, 'Turma não encontrada');
  }
  const turma = turmaResult.rows[0];

  const alunosResult = await pool.query(
    `SELECT a.id, a.nome, a.data_nascimento, a.responsavel, a.telefone_responsavel, m.ativa
     FROM alunos a
     INNER JOIN matriculas m ON a.id = m.aluno_id
     WHERE m.turma_id = $1 AND a.ativo = true
     ORDER BY a.nome ASC`,
    [turmaId]
  );

  res.render('admin/turmas/alunos', {
    titulo: `Alunos - ${turma.nome}`,
    turma,
    alunos: alunosResult.rows,
  });
});

const editarAlunosDaTurma = asyncHandler(async (req, res) => {
  const { turmaId } = req.params;

  const turmaResult = await pool.query('SELECT * FROM turmas WHERE id = $1', [turmaId]);
  if (turmaResult.rows.length === 0) {
    throw httpError(404, 'Turma não encontrada');
  }
  const turma = turmaResult.rows[0];

  const [alunosResult, matriculadosResult] = await Promise.all([
    pool.query(
      'SELECT id, nome FROM alunos WHERE ativo = true ORDER BY nome ASC'
    ),
    pool.query(
      `SELECT aluno_id FROM matriculas WHERE turma_id = $1 AND ativa = true`,
      [turmaId]
    ),
  ]);

  const alunosSelecionados = matriculadosResult.rows.map((row) => parseInt(row.aluno_id, 10));

  res.render('admin/turmas/alunos-editar', {
    titulo: 'Gerenciar Alunos',
    turma,
    alunos: alunosResult.rows,
    alunosSelecionados,
  });
});

const atualizarAlunosDaTurma = asyncHandler(async (req, res) => {
  const { turmaId } = req.params;
  const { alunos_ids } = req.body;

  const turmaResult = await pool.query(
    'SELECT id, trimestre, ano_letivo FROM turmas WHERE id = $1',
    [turmaId]
  );
  if (turmaResult.rows.length === 0) {
    throw httpError(404, 'Turma não encontrada');
  }
  const turma = turmaResult.rows[0];

  const ids = Array.isArray(alunos_ids)
    ? alunos_ids.map((id) => parseInt(id, 10)).filter((id) => Number.isInteger(id))
    : [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Desativa todas as matrículas dessa turma
    await client.query(
      'UPDATE matriculas SET ativa = false, atualizada_em = NOW() WHERE turma_id = $1',
      [turmaId]
    );

    // Reativa/cria matrículas para os alunos selecionados
    for (const alunoId of ids) {
      await client.query(
        `INSERT INTO matriculas (aluno_id, turma_id, trimestre, ano_letivo, data_matricula, ativa)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, true)
         ON CONFLICT (aluno_id, turma_id, trimestre, ano_letivo)
         DO UPDATE SET ativa = true, atualizada_em = NOW()`,
        [alunoId, turmaId, turma.trimestre, turma.ano_letivo]
      );
    }

    await client.query('COMMIT');
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }

  req.flash('sucesso');
  res.redirect(`/admin/turmas/${turmaId}/alunos`);
});

module.exports = {
  listarPorTurma,
  listarAlunosDaTurma,
  editarAlunosDaTurma,
  atualizarAlunosDaTurma,
  adicionarAluno,
  removerAluno,
  toggleAlunoStatus,
};
