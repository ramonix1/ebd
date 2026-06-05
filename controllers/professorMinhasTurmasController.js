const pool = require('../config/db');
const { asyncHandler } = require('../middleware/asyncHandler');

const minhasTurmas = asyncHandler(async (req, res) => {
  const usuarioId = req.session.usuario.id;
  const isAdmin = req.session.usuario.tipo === 'admin';

  let turmasResult;

  if (isAdmin) {
    // Admin vê todas as turmas
    turmasResult = await pool.query(
      `SELECT t.id, t.nome, t.dia_semana, t.horario_inicio, t.horario_fim, t.trimestre, t.ano_letivo,
              COUNT(DISTINCT m.aluno_id) as total_alunos
       FROM turmas t
       LEFT JOIN matriculas m ON t.id = m.turma_id AND m.ativa = true
       WHERE t.ativa = true
       GROUP BY t.id
       ORDER BY t.nome ASC`
    );
  } else {
    // Professor vê apenas suas turmas
    turmasResult = await pool.query(
      `SELECT t.id, t.nome, t.dia_semana, t.horario_inicio, t.horario_fim, t.trimestre, t.ano_letivo,
              COUNT(DISTINCT m.aluno_id) as total_alunos
       FROM turmas t
       INNER JOIN turma_professores tp ON t.id = tp.turma_id
       LEFT JOIN matriculas m ON t.id = m.turma_id AND m.ativa = true
       WHERE tp.usuario_id = $1 AND tp.ativo = true AND t.ativa = true
       GROUP BY t.id
       ORDER BY t.nome ASC`,
      [usuarioId]
    );
  }

  res.render('professor/turmas', {
    titulo: isAdmin ? 'Turmas' : 'Minhas Turmas',
    turmas: turmasResult.rows,
  });
});

module.exports = {
  minhasTurmas,
};
