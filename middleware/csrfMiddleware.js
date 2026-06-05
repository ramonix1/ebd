const crypto = require('crypto');

// Token CSRF por sessão (synchronizer token pattern). Sem dependências externas.
function obterToken(req) {
  if (!req.session) return null;
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

// Disponibiliza o token às views (res.locals.csrfToken) e garante sua criação.
// Fallback para '' se não conseguir criar (ex: sem sessão).
const csrfToken = (req, res, next) => {
  res.locals.csrfToken = obterToken(req) || '';
  next();
};

function tokenValido(req) {
  const tokenSessao = req.session && req.session.csrfToken;
  const enviado =
    (req.body && req.body._csrf) ||
    req.headers['x-csrf-token'] ||
    (req.query && req.query._csrf);

  if (!tokenSessao || !enviado) return false;

  const a = Buffer.from(String(tokenSessao));
  const b = Buffer.from(String(enviado));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

function falhaCsrf(next) {
  const erro = new Error('Token CSRF inválido ou ausente');
  erro.status = 403;
  return next(erro);
}

// Proteção global: valida requisições que alteram estado.
// Pula multipart/form-data, cujo corpo só é parseado pelo multer mais adiante;
// essas rotas usam verifyCsrf logo após o upload.
const csrfProtection = (req, res, next) => {
  if (METODOS_SEGUROS.has(req.method)) return next();
  if (req.is('multipart/form-data')) return next();
  if (!tokenValido(req)) return falhaCsrf(next);
  next();
};

// Validação forçada (usada após o multer parsear corpos multipart).
const verifyCsrf = (req, res, next) => {
  if (!tokenValido(req)) return falhaCsrf(next);
  next();
};

module.exports = { csrfToken, csrfProtection, verifyCsrf };
