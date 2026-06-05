const { asyncHandler, httpError } = require('../../middleware/asyncHandler');

describe('asyncHandler', () => {
  test('encaminha erros de promises rejeitadas para o next', async () => {
    const erro = new Error('falhou');
    const handler = asyncHandler(async () => {
      throw erro;
    });
    const next = jest.fn();
    await handler({}, {}, next);
    expect(next).toHaveBeenCalledWith(erro);
  });

  test('não chama next quando o handler resolve', async () => {
    const handler = asyncHandler(async (req, res) => {
      res.ok = true;
    });
    const next = jest.fn();
    const res = {};
    await handler({}, res, next);
    expect(res.ok).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('httpError', () => {
  test('cria um Error com status', () => {
    const e = httpError(404, 'não encontrado');
    expect(e).toBeInstanceOf(Error);
    expect(e.status).toBe(404);
    expect(e.message).toBe('não encontrado');
  });
});
