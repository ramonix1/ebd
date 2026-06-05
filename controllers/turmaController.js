const pool = require('../config/db');
const { asyncHandler, httpError } = require('../middleware/asyncHandler');

// Normaliza o campo de professores (pode vir como string, array ou ausente).
function normalizarIds(professores_ids) {
  const bruto = Array.isArray(professores_ids)
    ? professores_ids
    : professores_ids
      ? [professores_ids]
      : [];
  return bruto.map((id) => parseInt(id, 10)).filter((id) => Number.isInteger(id));
}

// Vincula uma lista de professores a uma turma em um único INSERT.
async function vincularProfessores(client, turmaId, ids) {
  if (ids.length === 0) return;
  const placeholders = ids.map((_, i) => `($1, $${i + 2}, CURRENT_DATE, true)`).join(', ');
  await client.query(
    `INSERT INTO turma_professores (turma_id, usuario_id, desde, ativo) VALUES ${placeholders}`,
    [turmaId, ...ids]
  );
}

const listar = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT
      t.*,
      STRING_AGG(u.nome, ', ' ORDER BY u.nome) as professores_nomes
     FROM turmas t
     LEFT JOIN turma_professores tp ON t.id = tp.turma_id AND tp.ativo = true
     LEFT JOIN usuarios u ON tp.usuario_id = u.id
     WHERE t.ativa = true
     GROUP BY t.id
     ORDER BY t.nome ASC`
  );
  res.render('admin/turmas/lista', {
    titulo: 'Turmas',
    turmas: result.rows,
  });
});

const formularioNovo = asyncHandler(async (req, res) => {
  const professores = await pool.query(
    'SELECT id, nome FROM usuarios WHERE tipo = $1 AND ativo = true ORDER BY nome ASC',
    ['professor']
  );
  res.render('admin/turmas/form', {
    titulo: 'Nova Turma',
    turma: null,
    professores: professores.rows,
    professoresSelecionados: [],
  });
});

const criar = asyncHandler(async (req, res) => {
  const {
    nome, descricao, faixa_etaria, dia_semana,
    horario_inicio, horario_fim, trimestre, professores_ids,
  } = req.body;

  const anoLetivo = new Date().getFullYear();
  const ids = normalizarIds(professores_ids);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO turmas (nome, descricao, faixa_etaria, dia_semana, horario_inicio, horario_fim, trimestre, ano_letivo, ativa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING id`,
      [nome, descricao, faixa_etaria, dia_semana, horario_inicio, horario_fim, trimestre, anoLetivo]
    );
    await vincularProfessores(client, result.rows[0].id, ids);
    await client.query('COMMIT');
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }

  req.flash('sucesso');
  res.redirect('/admin/turmas');
});

const editar = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const turmaResult = await pool.query('SELECT * FROM turmas WHERE id = $1', [id]);
  if (turmaResult.rows.length === 0) {
    throw httpError(404, 'Turma não encontrada');
  }

  const professoresResult = await pool.query(
    'SELECT id, nome FROM usuarios WHERE tipo = $1 AND ativo = true ORDER BY nome ASC',
    ['professor']
  );

  const vinculadosResult = await pool.query(
    'SELECT usuario_id FROM turma_professores WHERE turma_id = $1 AND ativo = true',
    [id]
  );

  const professoresSelecionados = vinculadosResult.rows.map((row) => parseInt(row.usuario_id, 10));

  res.render('admin/turmas/form', {
    titulo: 'Editar Turma',
    turma: turmaResult.rows[0],
    professores: professoresResult.rows,
    professoresSelecionados,
  });
});

const atualizar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    nome, descricao, faixa_etaria, dia_semana,
    horario_inicio, horario_fim, trimestre, professores_ids,
  } = req.body;

  const ids = normalizarIds(professores_ids);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE turmas SET nome = $1, descricao = $2, faixa_etaria = $3, dia_semana = $4,
       horario_inicio = $5, horario_fim = $6, trimestre = $7, atualizada_em = NOW()
       WHERE id = $8`,
      [nome, descricao, faixa_etaria, dia_semana, horario_inicio, horario_fim, trimestre, id]
    );
    await client.query('DELETE FROM turma_professores WHERE turma_id = $1', [id]);
    await vincularProfessores(client, id, ids);
    await client.query('COMMIT');
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }

  req.flash('sucesso');
  res.redirect('/admin/turmas');
});

const deletar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Soft delete - preserva histórico de frequência/matrículas
  await pool.query(
    'UPDATE turmas SET ativa = false, atualizada_em = NOW() WHERE id = $1',
    [id]
  );
  req.flash('sucesso');
  res.redirect('/admin/turmas');
});

module.exports = {
  listar,
  formularioNovo,
  criar,
  editar,
  atualizar,
  deletar,
};
