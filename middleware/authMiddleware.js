const pool = require('../config/db');
const { httpError } = require('./asyncHandler');

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

const requireProfessor = (req, res, next) => {
  if (req.session.usuario.tipo !== 'professor' && req.session.usuario.tipo !== 'admin') {
    return next(httpError(403, 'Você não tem permissão para acessar esta página.'));
  }
  next();
};

// Garante que o professor só acesse turmas às quais está vinculado.
// Admin tem acesso a todas. Espera :turmaId (ou :id) na rota.
const requireTurmaAccess = async (req, res, next) => {
  try {
    if (req.session.usuario.tipo === 'admin') return next();

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
  requireProfessor,
  requireTurmaAccess,
};
