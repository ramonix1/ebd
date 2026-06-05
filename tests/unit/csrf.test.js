const { csrfToken, csrfProtection, verifyCsrf } = require('../../middleware/csrfMiddleware');

function criarReq({ method = 'GET', session = {}, body = {}, headers = {}, contentType = null } = {}) {
  return {
    method,
    session,
    body,
    headers,
    query: {},
    is: (tipo) => (contentType ? contentType.includes(tipo.replace('*', '')) : false),
  };
}

describe('csrfMiddleware', () => {
  test('csrfToken cria e expõe o token na sessão e em res.locals', () => {
    const req = criarReq();
    const res = { locals: {} };
    csrfToken(req, res, () => {});
    expect(req.session.csrfToken).toBeTruthy();
    expect(res.locals.csrfToken).toBe(req.session.csrfToken);
  });

  test('csrfProtection libera métodos seguros (GET)', () => {
    const next = jest.fn();
    csrfProtection(criarReq({ method: 'GET' }), {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  test('csrfProtection bloqueia POST sem token', () => {
    const next = jest.fn();
    csrfProtection(criarReq({ method: 'POST', session: { csrfToken: 'abc' } }), {}, next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(next.mock.calls[0][0].status).toBe(403);
  });

  test('csrfProtection libera POST com token válido', () => {
    const next = jest.fn();
    const req = criarReq({ method: 'POST', session: { csrfToken: 'abc' }, body: { _csrf: 'abc' } });
    csrfProtection(req, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  test('csrfProtection ignora multipart (validado depois do multer)', () => {
    const next = jest.fn();
    const req = criarReq({ method: 'POST', contentType: 'multipart/form-data', session: { csrfToken: 'abc' } });
    csrfProtection(req, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  test('verifyCsrf valida via header x-csrf-token', () => {
    const next = jest.fn();
    const req = criarReq({ method: 'POST', session: { csrfToken: 'tok' }, headers: { 'x-csrf-token': 'tok' } });
    verifyCsrf(req, {}, next);
    expect(next).toHaveBeenCalledWith();
  });
});
