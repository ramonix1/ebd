const argon2 = require('argon2');
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');
const { asyncHandler, httpError } = require('../middleware/asyncHandler');

const ARGON_OPTS = { type: argon2.argon2id, memoryCost: 2 ** 16, timeCost: 3, parallelism: 1 };

// Remove um arquivo de foto do disco (caminho relativo a /public), se existir.
function removerArquivoFoto(fotoRelativa) {
  if (!fotoRelativa) return;
  const caminho = path.join(__dirname, '../public', fotoRelativa);
  if (fs.existsSync(caminho)) {
    fs.unlinkSync(caminho);
  }
}

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

  const usuarioAtual = await pool.query('SELECT foto_perfil FROM usuarios WHERE id = $1', [usuarioId]);
  let fotoNova = usuarioAtual.rows[0].foto_perfil;

  if (req.file) {
    removerArquivoFoto(fotoNova);
    fotoNova = `/uploads/perfis/${req.file.filename}`;
  }

  if (senha) {
    const senhaHash = await argon2.hash(senha, ARGON_OPTS);
    await pool.query(
      'UPDATE usuarios SET nome = $1, senha = $2, foto_perfil = $3, atualizado_em = NOW() WHERE id = $4',
      [nome, senhaHash, fotoNova, usuarioId]
    );
  } else {
    await pool.query(
      'UPDATE usuarios SET nome = $1, foto_perfil = $2, atualizado_em = NOW() WHERE id = $3',
      [nome, fotoNova, usuarioId]
    );
  }

  req.session.usuario.nome = nome;
  req.flash('sucesso');
  res.redirect('/perfil');
});

const deletarFoto = asyncHandler(async (req, res) => {
  const usuarioId = req.session.usuario.id;

  const result = await pool.query('SELECT foto_perfil FROM usuarios WHERE id = $1', [usuarioId]);
  if (result.rows.length > 0) {
    removerArquivoFoto(result.rows[0].foto_perfil);
  }

  await pool.query(
    'UPDATE usuarios SET foto_perfil = NULL, atualizado_em = NOW() WHERE id = $1',
    [usuarioId]
  );

  req.flash('sucesso');
  res.redirect('/perfil');
});

module.exports = {
  exibir,
  atualizar,
  deletarFoto,
};
