const pool = require('../config/db');
const { asyncHandler } = require('../middleware/asyncHandler');

const adminDashboard = asyncHandler(async (req, res) => {
  // Indicadores independentes em paralelo
  const [turmasResult, alunosResult, professoresResult, frequenciaResult, ultimaAulaResult, rankingTurmasResult] =
    await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM turmas WHERE ativa = true'),
      pool.query('SELECT COUNT(*) as total FROM alunos WHERE ativo = true'),
      pool.query("SELECT COUNT(*) as total FROM usuarios WHERE tipo = 'professor' AND ativo = true"),
      pool.query(
        `SELECT ROUND(
            (SELECT COUNT(*) FROM frequencia WHERE presente = true AND data_aula >= NOW() - INTERVAL '30 days')::numeric /
            NULLIF((SELECT COUNT(*) FROM frequencia WHERE data_aula >= NOW() - INTERVAL '30 days'), 0) * 100, 1
          ) as media`
      ),
      pool.query('SELECT MAX(data_aula) as data FROM frequencia'),
      pool.query(
        `SELECT t.id, t.nome,
          COUNT(*) as total_registros,
          SUM(CASE WHEN f.presente = true THEN 1 ELSE 0 END) as presentes,
          ROUND(
            (SUM(CASE WHEN f.presente = true THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 1
          ) as percentual
         FROM turmas t
         LEFT JOIN frequencia f ON t.id = f.turma_id
         WHERE t.ativa = true
         GROUP BY t.id, t.nome
         ORDER BY percentual DESC NULLS LAST`
      ),
    ]);

  const ultimaAula = ultimaAulaResult.rows[0]?.data;

  // Indicadores que dependem da última aula
  let alunosPresentes = 0;
  let turmasSemChamada = [];
  if (ultimaAula) {
    const [presentesResult, semChamadaResult] = await Promise.all([
      pool.query(
        'SELECT COUNT(*) as total FROM frequencia WHERE data_aula = $1 AND presente = true',
        [ultimaAula]
      ),
      pool.query(
        `SELECT t.id, t.nome FROM turmas t
         WHERE t.ativa = true
         AND t.id NOT IN (SELECT DISTINCT turma_id FROM frequencia WHERE data_aula = $1)`,
        [ultimaAula]
      ),
    ]);
    alunosPresentes = presentesResult.rows[0].total;
    turmasSemChamada = semChamadaResult.rows;
  }

  res.render('admin/dashboard', {
    titulo: 'Dashboard Admin',
    stats: {
      turmas: turmasResult.rows[0].total,
      alunos: alunosResult.rows[0].total,
      professores: professoresResult.rows[0].total,
      frequencia: frequenciaResult.rows[0].media || 0,
      alunosPresentes,
      ultimaAula,
      rankingTurmas: rankingTurmasResult.rows,
      turmasSemChamada,
    },
  });
});

const professorDashboard = asyncHandler(async (req, res) => {
  const usuarioId = req.session.usuario.id;
  const isAdmin = req.session.usuario.tipo === 'admin';

  let turmasResult, alunosResult, frequenciaResult, ultimaChamadaResult;

  if (isAdmin) {
    [turmasResult, alunosResult, frequenciaResult, ultimaChamadaResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM turmas WHERE ativa = true'),
      pool.query('SELECT COUNT(DISTINCT aluno_id) as total FROM matriculas WHERE ativa = true'),
      pool.query(
        `SELECT ROUND(
            (SELECT COUNT(*) FROM frequencia WHERE presente = true AND data_aula >= NOW() - INTERVAL '30 days')::numeric /
            NULLIF((SELECT COUNT(*) FROM frequencia WHERE data_aula >= NOW() - INTERVAL '30 days'), 0) * 100, 1
          ) as media`
      ),
      pool.query('SELECT MAX(data_aula) as data FROM frequencia'),
    ]);
  } else {
    [turmasResult, alunosResult, frequenciaResult, ultimaChamadaResult] = await Promise.all([
      pool.query(
        'SELECT COUNT(DISTINCT turma_id) as total FROM turma_professores WHERE usuario_id = $1 AND ativo = true',
        [usuarioId]
      ),
      pool.query(
        `SELECT COUNT(DISTINCT m.aluno_id) as total
         FROM matriculas m
         WHERE m.turma_id IN (
           SELECT turma_id FROM turma_professores WHERE usuario_id = $1 AND ativo = true
         ) AND m.ativa = true`,
        [usuarioId]
      ),
      pool.query(
        `SELECT ROUND(
            (SELECT COUNT(*) FROM frequencia
             WHERE registrado_por = $1 AND presente = true AND data_aula >= NOW() - INTERVAL '30 days')::numeric /
            NULLIF((SELECT COUNT(*) FROM frequencia
             WHERE registrado_por = $1 AND data_aula >= NOW() - INTERVAL '30 days'), 0) * 100, 1
          ) as media`,
        [usuarioId]
      ),
      pool.query('SELECT MAX(data_aula) as data FROM frequencia WHERE registrado_por = $1', [usuarioId]),
    ]);
  }

  const ultimaChamada = ultimaChamadaResult.rows[0]?.data;
  const hoje = new Date().toISOString().split('T')[0];
  const isDomingo = new Date(hoje + 'T00:00:00').getDay() === 0;

  let chamadaHojeRegistrada = false;
  if (isDomingo) {
    const chamadaHojeResult = await pool.query(
      isAdmin
        ? 'SELECT COUNT(*) as total FROM frequencia WHERE data_aula = $1'
        : 'SELECT COUNT(*) as total FROM frequencia WHERE registrado_por = $1 AND data_aula = $2',
      isAdmin ? [hoje] : [usuarioId, hoje]
    );
    chamadaHojeRegistrada = chamadaHojeResult.rows[0].total > 0;
  }

  res.render('professor/dashboard', {
    titulo: 'Dashboard Professor',
    stats: {
      turmas: turmasResult.rows[0].total,
      alunos: alunosResult.rows[0].total,
      frequencia: frequenciaResult.rows[0].media || 0,
      ultimaChamada,
      isDomingo,
      chamadaHojeRegistrada,
    },
  });
});

module.exports = {
  adminDashboard,
  professorDashboard,
};
