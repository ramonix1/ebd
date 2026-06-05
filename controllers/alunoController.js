const pool = require('../config/db');
const { asyncHandler, httpError } = require('../middleware/asyncHandler');

const listar = asyncHandler(async (req, res) => {
  const { busca, turma, status, ordem } = req.query;

  let query = `
    SELECT
      a.id,
      a.nome,
      a.data_nascimento,
      a.responsavel,
      a.email_responsavel,
      a.telefone_responsavel,
      a.ativo,
      COALESCE(STRING_AGG(DISTINCT t.nome, ', ' ORDER BY t.nome), '') as turmas
    FROM alunos a
    LEFT JOIN matriculas m ON a.id = m.aluno_id AND m.ativa = true
    LEFT JOIN turmas t ON m.turma_id = t.id AND t.ativa = true
    WHERE 1=1
  `;

  const params = [];
  let paramCount = 1;

  // Filtro de busca
  if (busca && busca.trim()) {
    query += ` AND a.nome ILIKE $${paramCount}`;
    params.push(`%${busca.trim()}%`);
    paramCount++;
  }

  // Filtro de turma
  if (turma) {
    query += ` AND t.id = $${paramCount}`;
    params.push(turma);
    paramCount++;
  }

  // Filtro de status
  if (status) {
    query += ` AND a.ativo = $${paramCount}`;
    params.push(status === 'ativo');
    paramCount++;
  }

  query += ` GROUP BY a.id, a.nome, a.data_nascimento, a.responsavel, a.email_responsavel, a.telefone_responsavel, a.ativo`;

  // Ordenação
  let orderClause = ' ORDER BY a.nome ASC';
  if (ordem === 'nome_desc') orderClause = ' ORDER BY a.nome DESC';
  else if (ordem === 'turma') orderClause = ' ORDER BY turmas ASC, a.nome ASC';
  else if (ordem === 'turma_desc') orderClause = ' ORDER BY turmas DESC, a.nome ASC';
  else if (ordem === 'status') orderClause = ' ORDER BY a.ativo DESC, a.nome ASC';

  query += orderClause;

  const result = await pool.query(query, params);

  // Buscar turmas para o filtro
  const turmasResult = await pool.query(
    `SELECT DISTINCT t.id, t.nome FROM turmas t
     INNER JOIN matriculas m ON t.id = m.turma_id AND m.ativa = true
     ORDER BY t.nome ASC`
  );

  res.render('admin/alunos/lista', {
    titulo: 'Alunos',
    alunos: result.rows,
    turmas: turmasResult.rows,
    filtros: { busca, turma, status, ordem },
  });
});

const formularioNovo = (req, res) => {
  res.render('admin/alunos/form', {
    titulo: 'Novo Aluno',
    aluno: null,
  });
};

const criar = asyncHandler(async (req, res) => {
  const { nome, data_nascimento, responsavel, email_responsavel, telefone_responsavel } = req.body;

  await pool.query(
    `INSERT INTO alunos (nome, data_nascimento, responsavel, email_responsavel, telefone_responsavel, ativo)
     VALUES ($1, $2, $3, $4, $5, true)`,
    [nome, data_nascimento || null, responsavel || null, email_responsavel || null, telefone_responsavel || null]
  );

  req.flash('sucesso');
  res.redirect('/admin/alunos');
});

const editar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM alunos WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    throw httpError(404, 'Aluno não encontrado');
  }

  res.render('admin/alunos/form', {
    titulo: 'Editar Aluno',
    aluno: result.rows[0],
  });
});

const atualizar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nome, data_nascimento, responsavel, email_responsavel, telefone_responsavel } = req.body;

  await pool.query(
    `UPDATE alunos SET nome = $1, data_nascimento = $2, responsavel = $3,
     email_responsavel = $4, telefone_responsavel = $5, atualizado_em = NOW()
     WHERE id = $6`,
    [nome, data_nascimento || null, responsavel || null, email_responsavel || null, telefone_responsavel || null, id]
  );

  req.flash('sucesso');
  res.redirect('/admin/alunos');
});

const deletar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Soft delete - apenas marca como inativo
  await pool.query(
    'UPDATE alunos SET ativo = false, atualizado_em = NOW() WHERE id = $1',
    [id]
  );
  req.flash('sucesso');
  res.redirect('/admin/alunos');
});

const toggleStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get current status
  const result = await pool.query('SELECT ativo FROM alunos WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    throw httpError(404, 'Aluno não encontrado');
  }

  const novoStatus = !result.rows[0].ativo;

  // Toggle status
  await pool.query(
    'UPDATE alunos SET ativo = $1, atualizado_em = NOW() WHERE id = $2',
    [novoStatus, id]
  );

  req.flash('sucesso');
  res.redirect('/admin/alunos');
});

module.exports = {
  listar,
  formularioNovo,
  criar,
  editar,
  atualizar,
  deletar,
  toggleStatus,
};
