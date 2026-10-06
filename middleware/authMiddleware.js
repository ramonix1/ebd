const pool = require('../config/db');
const { httpError } = require('./asyncHandler');

const TIPOS_GESTAO = ['admin', 'secretaria'];

const requireAuth = (req, res, next) => {
  if (!req.session.usuario) {
    return res.redirect('/login');
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.session.usuario.tipo !== 'admin') {
    return next(httpError(403, 'Você não tem permissão para acessar esta página.'));
  }
  next();
};

// Gestão: admin ou secretaria (tudo do admin, exceto gerenciar usuários).
const requireGestao = (req, res, next) => {
  if (!TIPOS_GESTAO.includes(req.session.usuario.tipo)) {
    return next(httpError(403, 'Você não tem permissão para acessar esta página.'));
  }
  next();
};

const requireProfessor = (req, res, next) => {
  if (req.session.usuario.tipo !== 'professor' && !TIPOS_GESTAO.includes(req.session.usuario.tipo)) {
    return next(httpError(403, 'Você não tem permissão para acessar esta página.'));
  }
  next();
};

// Garante que o professor só acesse turmas às quais está vinculado.
// Admin e secretaria têm acesso a todas. Espera :turmaId (ou :id) na rota.
const requireTurmaAccess = async (req, res, next) => {
  try {
    if (TIPOS_GESTAO.includes(req.session.usuario.tipo)) return next();

    const turmaId = req.params.turmaId || req.params.id;
    const result = await pool.query(
      'SELECT 1 FROM turma_professores WHERE turma_id = $1 AND usuario_id = $2 AND ativo = true',
      [turmaId, req.session.usuario.id]
    );

    if (result.rows.length === 0) {
      return next(httpError(403, 'Você não tem acesso a esta turma.'));
    }
    next();
  } catch (erro) {
    next(erro);
  }
};

module.exports = {
  requireAuth,
  requireAdmin,
  requireGestao,
  requireProfessor,
  requireTurmaAccess,
};
