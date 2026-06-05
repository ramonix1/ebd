// Envolve handlers assíncronos para encaminhar erros ao error handler central,
// eliminando a repetição de try/catch + render('error') em cada controller.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Cria um Error com status HTTP, tratado pelo error handler central.
const httpError = (status, mensagem) => {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
};

module.exports = { asyncHandler, httpError };
