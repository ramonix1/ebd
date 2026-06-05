// Mensagens flash persistidas na sessão, expostas às views como res.locals.sucesso
// e res.locals.erro. Substitui o frágil padrão de querystring (?sucesso=1).
const flash = (req, res, next) => {
  const dados = (req.session && req.session.flash) || {};
  if (req.session) req.session.flash = {};

  res.locals.sucesso = dados.sucesso || null;
  res.locals.erro = dados.erro || null;

  req.flash = (tipo, mensagem) => {
    if (!req.session) return;
    if (!req.session.flash) req.session.flash = {};
    req.session.flash[tipo] = mensagem === undefined ? true : mensagem;
  };

  next();
};

module.exports = flash;
