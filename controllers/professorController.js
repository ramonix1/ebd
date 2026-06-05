const argon2 = require('argon2');
const pool = require('../config/db');
const { asyncHandler, httpError } = require('../middleware/asyncHandler');

const ARGON_OPTS = { type: argon2.argon2id, memoryCost: 2 ** 16, timeCost: 3, parallelism: 1 };

const listar = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT u.id, u.email, u.nome, u.ativo, u.criado_em,
            COUNT(tp.id) as total_turmas,
            STRING_AGG(t.nome, ', ' ORDER BY t.nome) as turmas_nomes
     FROM usuarios u
     LEFT JOIN turma_professores tp ON u.id = tp.usuario_id AND tp.ativo = true
     LEFT JOIN turmas t ON tp.turma_id = t.id
     WHERE u.tipo = 'professor'
     GROUP BY u.id
     ORDER BY u.nome ASC`
  );
  res.render('admin/professores/lista', {
    titulo: 'Professores',
    professores: result.rows,
  });
});

const formularioNovo = (req, res) => {
  res.render('admin/professores/form', {
    titulo: 'Novo Professor',
    professor: null,
  });
};

const criar = asyncHandler(async (req, res) => {
  const { nome, email, telefone, senha } = req.body;

  const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  if (existe.rows.length > 0) {
    req.flash('erro', 'Email já cadastrado');
    return res.redirect('/admin/professores/novo');
  }

  const senhaHash = await argon2.hash(senha, ARGON_OPTS);

  await pool.query(
    'INSERT INTO usuarios (email, senha, nome, tipo, telefone, ativo) VALUES ($1, $2, $3, $4, $5, true)',
    [email, senhaHash, nome, 'professor', telefone || null]
  );

  req.flash('sucesso');
  res.redirect('/admin/professores');
});

const editar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    'SELECT id, email, nome, ativo, telefone FROM usuarios WHERE id = $1 AND tipo = $2',
    [id, 'professor']
  );

  if (result.rows.length === 0) {
    throw httpError(404, 'Professor não encontrado');
  }

  res.render('admin/professores/form', {
    titulo: 'Editar Professor',
    professor: result.rows[0],
  });
});

const atualizar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nome, telefone, senha, ativo } = req.body;
  const ativoBooleano = ativo === 'on' || ativo === true;

  if (senha) {
    const senhaHash = await argon2.hash(senha, ARGON_OPTS);
    await pool.query(
      'UPDATE usuarios SET nome = $1, telefone = $2, senha = $3, ativo = $4, atualizado_em = NOW() WHERE id = $5 AND tipo = $6',
      [nome, telefone || null, senhaHash, ativoBooleano, id, 'professor']
    );
  } else {
    await pool.query(
      'UPDATE usuarios SET nome = $1, telefone = $2, ativo = $3, atualizado_em = NOW() WHERE id = $4 AND tipo = $5',
      [nome, telefone || null, ativoBooleano, id, 'professor']
    );
  }

  req.flash('sucesso');
  res.redirect('/admin/professores');
});

const deletar = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Soft delete: desativa o professor e suas vinculações, preservando o
  // histórico de frequência (frequencia.registrado_por aponta para usuarios).
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE turma_professores SET ativo = false WHERE usuario_id = $1', [id]);
    await client.query(
      "UPDATE usuarios SET ativo = false, atualizado_em = NOW() WHERE id = $1 AND tipo = 'professor'",
      [id]
    );
    await client.query('COMMIT');
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }

  req.flash('sucesso');
  res.redirect('/admin/professores');
});

const supervisao = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT
      u.id, u.nome, u.email, u.telefone,
      COUNT(DISTINCT tp.turma_id) as total_turmas,
      COUNT(DISTINCT m.aluno_id) as total_alunos,
      MAX(f.data_aula) as ultima_chamada,
      ROUND(
        (SELECT COUNT(*) FROM frequencia WHERE registrado_por = u.id AND presente = true)::numeric /
        NULLIF((SELECT COUNT(*) FROM frequencia WHERE registrado_por = u.id), 0) * 100,
        1
      ) as frequencia_media
     FROM usuarios u
     LEFT JOIN turma_professores tp ON u.id = tp.usuario_id AND tp.ativo = true
     LEFT JOIN matriculas m ON tp.turma_id = m.turma_id AND m.ativa = true
     LEFT JOIN frequencia f ON u.id = f.registrado_por
     WHERE u.tipo = 'professor' AND u.ativo = true
     GROUP BY u.id
     ORDER BY u.nome ASC`
  );

  res.render('admin/professores/supervisao', {
    titulo: 'Supervisão de Professores',
    professores: result.rows,
  });
});

const dashboardSupervisao = asyncHandler(async (req, res) => {
  const { professorId } = req.params;

  const professorResult = await pool.query(
    'SELECT id, nome, email FROM usuarios WHERE id = $1 AND tipo = $2 AND ativo = true',
    [professorId, 'professor']
  );

  if (professorResult.rows.length === 0) {
    throw httpError(404, 'Professor não encontrado');
  }

  const professor = professorResult.rows[0];
  const hoje = new Date().toISOString().split('T')[0];
  const isDomingo = new Date(hoje + 'T00:00:00').getDay() === 0;

  // Queries independentes em paralelo
  const [turmasResult, alunosResult, frequenciaResult, ultimaChamadaResult, turmasDetalhesResult] =
    await Promise.all([
      pool.query(
        'SELECT COUNT(DISTINCT turma_id) as total FROM turma_professores WHERE usuario_id = $1 AND ativo = true',
        [professorId]
      ),
      pool.query(
        `SELECT COUNT(DISTINCT m.aluno_id) as total
         FROM matriculas m
         WHERE m.turma_id IN (
           SELECT turma_id FROM turma_professores WHERE usuario_id = $1 AND ativo = true
         ) AND m.ativa = true`,
        [professorId]
      ),
      pool.query(
        `SELECT ROUND(
            (SELECT COUNT(*) FROM frequencia WHERE registrado_por = $1 AND presente = true)::numeric /
            NULLIF((SELECT COUNT(*) FROM frequencia WHERE registrado_por = $1), 0) * 100, 1
          ) as media`,
        [professorId]
      ),
      pool.query('SELECT MAX(data_aula) as data FROM frequencia WHERE registrado_por = $1', [professorId]),
      pool.query(
        `SELECT t.id, t.nome, t.dia_semana, t.horario_inicio, t.horario_fim, t.trimestre, t.ano_letivo,
                COUNT(DISTINCT m.aluno_id) as total_alunos,
                (SELECT MAX(data_aula) FROM frequencia WHERE turma_id = t.id) as ultima_aula
         FROM turmas t
         INNER JOIN turma_professores tp ON t.id = tp.turma_id
         LEFT JOIN matriculas m ON t.id = m.turma_id AND m.ativa = true
         WHERE tp.usuario_id = $1 AND tp.ativo = true AND t.ativa = true
         GROUP BY t.id
         ORDER BY t.nome ASC`,
        [professorId]
      ),
    ]);

  let chamadaHojeRegistrada = false;
  if (isDomingo) {
    const chamadaHojeResult = await pool.query(
      'SELECT COUNT(*) as total FROM frequencia WHERE registrado_por = $1 AND data_aula = $2',
      [professorId, hoje]
    );
    chamadaHojeRegistrada = chamadaHojeResult.rows[0].total > 0;
  }

  const stats = {
    turmas: turmasResult.rows[0].total,
    alunos: alunosResult.rows[0].total,
    frequencia: frequenciaResult.rows[0].media || 0,
    ultimaChamada: ultimaChamadaResult.rows[0]?.data,
    isDomingo,
    chamadaHojeRegistrada,
  };

  res.render('admin/professores/dashboard-supervisao', {
    titulo: `Supervisão - ${professor.nome}`,
    professor,
    stats,
    turmas: turmasDetalhesResult.rows,
  });
});

module.exports = {
  listar,
  formularioNovo,
  criar,
  editar,
  atualizar,
  deletar,
  supervisao,
  dashboardSupervisao,
};
