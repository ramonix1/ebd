const argon2 = require('argon2');
const pool = require('../config/db');
const { asyncHandler, httpError } = require('../middleware/asyncHandler');

const ARGON_OPTS = { type: argon2.argon2id, memoryCost: 2 ** 16, timeCost: 3, parallelism: 1 };

const listar = asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT id, email, nome, tipo, ativo, criado_em FROM usuarios ORDER BY criado_em DESC'
  );
  res.render('admin/usuarios/lista', {
    titulo: 'Usuários',
    usuarios: result.rows,
  });
});

const formularioNovo = (req, res) => {
  res.render('admin/usuarios/form', {
    titulo: 'Novo Usuário',
    usuario: null,
  });
};

const criar = asyncHandler(async (req, res) => {
  const { nome, email, tipo, senha } = req.body;

  const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  if (existe.rows.length > 0) {
    req.flash('erro', 'Email já cadastrado');
    return res.redirect('/admin/usuarios/novo');
  }

  const senhaHash = await argon2.hash(senha, ARGON_OPTS);

  await pool.query(
    'INSERT INTO usuarios (email, senha, nome, tipo, ativo) VALUES ($1, $2, $3, $4, true)',
    [email, senhaHash, nome, tipo]
  );

  req.flash('sucesso');
  res.redirect('/admin/usuarios');
});

const editar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    'SELECT id, email, nome, tipo, ativo FROM usuarios WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    throw httpError(404, 'Usuário não encontrado');
  }

  res.render('admin/usuarios/form', {
    titulo: 'Editar Usuário',
    usuario: result.rows[0],
  });
});

const atualizar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nome, tipo, senha, ativo } = req.body;
  const ativoBooleano = ativo === 'on' || ativo === true;

  if (senha) {
    const senhaHash = await argon2.hash(senha, ARGON_OPTS);
    await pool.query(
      'UPDATE usuarios SET nome = $1, tipo = $2, senha = $3, ativo = $4, atualizado_em = NOW() WHERE id = $5',
      [nome, tipo, senhaHash, ativoBooleano, id]
    );
  } else {
    await pool.query(
      'UPDATE usuarios SET nome = $1, tipo = $2, ativo = $3, atualizado_em = NOW() WHERE id = $4',
      [nome, tipo, ativoBooleano, id]
    );
  }

  req.flash('sucesso');
  res.redirect('/admin/usuarios');
});

const deletar = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Não permitir deletar o próprio usuário
  if (req.session.usuario.id === parseInt(id, 10)) {
    throw httpError(400, 'Você não pode deletar sua própria conta');
  }

  // Soft delete - desativa o usuário (preserva histórico de frequência)
  await pool.query(
    'UPDATE usuarios SET ativo = false, atualizado_em = NOW() WHERE id = $1',
    [id]
  );
  req.flash('sucesso');
  res.redirect('/admin/usuarios');
});

module.exports = {
  listar,
  formularioNovo,
  criar,
  editar,
  atualizar,
  deletar,
};
