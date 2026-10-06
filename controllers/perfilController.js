const argon2 = require('argon2');
const pool = require('../config/db');
const { asyncHandler, httpError } = require('../middleware/asyncHandler');

const ARGON_OPTS = { type: argon2.argon2id, memoryCost: 2 ** 16, timeCost: 3, parallelism: 1 };

const exibir = asyncHandler(async (req, res) => {
  const usuarioId = req.session.usuario.id;

  const result = await pool.query(
    'SELECT id, nome, email, tipo, foto_perfil, criado_em FROM usuarios WHERE id = $1',
    [usuarioId]
  );

  if (result.rows.length === 0) {
    throw httpError(404, 'Usuário não encontrado');
  }

  res.render('perfil/editar', {
    titulo: 'Meu Perfil',
    usuario: result.rows[0],
  });
});

const atualizar = asyncHandler(async (req, res) => {
  const usuarioId = req.session.usuario.id;
  const { nome, senha } = req.body;

  if (senha) {
    const senhaHash = await argon2.hash(senha, ARGON_OPTS);
    await pool.query(
      'UPDATE usuarios SET nome = $1, senha = $2, atualizado_em = NOW() WHERE id = $3',
      [nome, senhaHash, usuarioId]
    );
  } else {
    await pool.query(
      'UPDATE usuarios SET nome = $1, atualizado_em = NOW() WHERE id = $2',
      [nome, usuarioId]
    );
  }

  // Foto: binário no banco; foto_perfil guarda a URL (com ?v= para invalidar cache).
  if (req.file) {
    await pool.query(
      'UPDATE usuarios SET foto_dados = $1, foto_mime = $2, foto_perfil = $3 WHERE id = $4',
      [req.file.buffer, req.file.mimetype, `/perfil/foto?v=${Date.now()}`, usuarioId]
    );
  }

  req.session.usuario.nome = nome;
  req.flash('sucesso');
  res.redirect('/perfil');
});

const deletarFoto = asyncHandler(async (req, res) => {
  const usuarioId = req.session.usuario.id;

  await pool.query(
    'UPDATE usuarios SET foto_perfil = NULL, foto_dados = NULL, foto_mime = NULL, atualizado_em = NOW() WHERE id = $1',
    [usuarioId]
  );

  req.flash('sucesso');
  res.redirect('/perfil');
});

// Serve a foto do usuário logado a partir do banco.
const foto = asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT foto_dados, foto_mime FROM usuarios WHERE id = $1',
    [req.session.usuario.id]
  );
  const { foto_dados: dados, foto_mime: mime } = result.rows[0] || {};
  if (!dados) {
    throw httpError(404, 'Foto não encontrada');
  }
  res.set({
    'Content-Type': mime,
    'Cache-Control': 'private, max-age=86400',
    'X-Content-Type-Options': 'nosniff',
  });
  res.send(dados);
});

module.exports = {
  exibir,
  atualizar,
  deletarFoto,
  foto,
};
