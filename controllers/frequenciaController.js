const pool = require('../config/db');
const { asyncHandler, httpError } = require('../middleware/asyncHandler');

const registrarFrequencia = asyncHandler(async (req, res) => {
  const { turmaId } = req.params;
  const hoje = new Date().toISOString().split('T')[0];

  const turmaResult = await pool.query('SELECT * FROM turmas WHERE id = $1', [turmaId]);
  if (turmaResult.rows.length === 0) {
    throw httpError(404, 'Turma não encontrada');
  }
  const turma = turmaResult.rows[0];

  const [alunosResult, frequenciasResult] = await Promise.all([
    pool.query(
      `SELECT a.id, a.nome FROM alunos a
       INNER JOIN matriculas m ON a.id = m.aluno_id
       WHERE m.turma_id = $1 AND m.ativa = true AND a.ativo = true
       ORDER BY a.nome ASC`,
      [turmaId]
    ),
    pool.query(
      'SELECT aluno_id, presente FROM frequencia WHERE turma_id = $1 AND data_aula = $2',
      [turmaId, hoje]
    ),
  ]);

  const frequenciasMap = {};
  frequenciasResult.rows.forEach((f) => {
    frequenciasMap[f.aluno_id] = f.presente;
  });

  const isDomingo = new Date(hoje + 'T00:00:00').getDay() === 0;

  res.render('professor/frequencia/registrar', {
    titulo: 'Registrar Frequência',
    turma,
    alunos: alunosResult.rows,
    dataAula: hoje,
    frequencias: frequenciasMap,
    chamadaJaRegistrada: frequenciasResult.rows.length > 0,
    isDomingo,
  });
});

const salvarFrequencia = asyncHandler(async (req, res) => {
  const { turmaId } = req.params;
  const { data_aula, presencas } = req.body;
  const usuarioId = req.session.usuario.id;

  // Só permite registrar chamada no dia da aula (hoje)
  const hoje = new Date().toISOString().split('T')[0];
  if (data_aula !== hoje) {
    throw httpError(400, 'Você só pode registrar chamada no dia da aula (hoje)');
  }

  const presencasArray = Array.isArray(presencas) ? presencas : presencas ? [presencas] : [];
  const presentesSet = new Set(presencasArray.map(String));

  const alunosResult = await pool.query(
    `SELECT a.id FROM alunos a
     INNER JOIN matriculas m ON a.id = m.aluno_id
     WHERE m.turma_id = $1 AND m.ativa = true AND a.ativo = true`,
    [turmaId]
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const aluno of alunosResult.rows) {
      const presente = presentesSet.has(aluno.id.toString());
      // UNIQUE(aluno_id, turma_id, data_aula) garante idempotência da chamada.
      await client.query(
        `INSERT INTO frequencia (aluno_id, turma_id, data_aula, presente, registrado_por)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (aluno_id, turma_id, data_aula)
         DO UPDATE SET presente = EXCLUDED.presente,
                       registrado_por = EXCLUDED.registrado_por,
                       registrado_em = NOW()`,
        [aluno.id, turmaId, data_aula, presente, usuarioId]
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
  res.redirect(`/professor/turma/${turmaId}/frequencia`);
});

const listarFrequencia = asyncHandler(async (req, res) => {
  const { turmaId } = req.params;

  const turmaResult = await pool.query('SELECT * FROM turmas WHERE id = $1', [turmaId]);
  if (turmaResult.rows.length === 0) {
    throw httpError(404, 'Turma não encontrada');
  }
  const turma = turmaResult.rows[0];

  const [historicoDiasResult, rankingAlunosResult] = await Promise.all([
    pool.query(
      `SELECT data_aula,
        SUM(CASE WHEN presente = true THEN 1 ELSE 0 END) as presentes,
        SUM(CASE WHEN presente = false THEN 1 ELSE 0 END) as faltosos,
        COUNT(*) as total,
        ROUND(SUM(CASE WHEN presente = true THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 1) as percentual
       FROM frequencia
       WHERE turma_id = $1
       GROUP BY data_aula
       ORDER BY data_aula DESC`,
      [turmaId]
    ),
    pool.query(
      `SELECT
        a.id, a.nome,
        COUNT(*) as total_aulas,
        SUM(CASE WHEN f.presente = true THEN 1 ELSE 0 END) as presencas,
        SUM(CASE WHEN f.presente = false THEN 1 ELSE 0 END) as faltas,
        ROUND(
          (SUM(CASE WHEN f.presente = true THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 1
        ) as percentual
       FROM alunos a
       INNER JOIN matriculas m ON a.id = m.aluno_id
       LEFT JOIN frequencia f ON a.id = f.aluno_id AND f.turma_id = $1
       WHERE m.turma_id = $1 AND m.ativa = true AND a.ativo = true
       GROUP BY a.id, a.nome
       ORDER BY presencas DESC`,
      [turmaId]
    ),
  ]);

  res.render('professor/frequencia/lista', {
    titulo: 'Frequência da Turma',
    turma,
    historicoDias: historicoDiasResult.rows,
    ranking: rankingAlunosResult.rows,
  });
});

module.exports = {
  registrarFrequencia,
  salvarFrequencia,
  listarFrequencia,
};
