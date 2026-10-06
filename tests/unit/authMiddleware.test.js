jest.mock('../../config/db', () => ({ query: jest.fn() }));
const pool = require('../../config/db');
const {
  requireAdmin,
  requireGestao,
  requireProfessor,
  requireTurmaAccess,
} = require('../../middleware/authMiddleware');

const reqCom = (tipo, extra = {}) => ({ session: { usuario: { id: 7, tipo } }, params: {}, ...extra });

function executar(mw, req) {
  const next = jest.fn();
  return Promise.resolve(mw(req, {}, next)).then(() => next);
}

describe('authMiddleware - perfis', () => {
  beforeEach(() => pool.query.mockReset());

  test.each([
    ['admin', true],
    ['secretaria', true],
    ['professor', false],
  ])('requireGestao com %s', async (tipo, permitido) => {
    const next = await executar(requireGestao, reqCom(tipo));
    if (permitido) expect(next).toHaveBeenCalledWith();
    else expect(next.mock.calls[0][0].status).toBe(403);
  });

  test.each([
    ['admin', true],
    ['secretaria', false],
    ['professor', false],
  ])('requireAdmin com %s', async (tipo, permitido) => {
    const next = await executar(requireAdmin, reqCom(tipo));
    if (permitido) expect(next).toHaveBeenCalledWith();
    else expect(next.mock.calls[0][0].status).toBe(403);
  });

  test.each(['admin', 'secretaria', 'professor'])('requireProfessor libera %s', async (tipo) => {
    const next = await executar(requireProfessor, reqCom(tipo));
    expect(next).toHaveBeenCalledWith();
  });

  test.each(['admin', 'secretaria'])('requireTurmaAccess: %s acessa qualquer turma sem consultar o banco', async (tipo) => {
    const next = await executar(requireTurmaAccess, reqCom(tipo, { params: { turmaId: '99' } }));
    expect(next).toHaveBeenCalledWith();
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('requireTurmaAccess: professor vinculado passa', async () => {
    pool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    const next = await executar(requireTurmaAccess, reqCom('professor', { params: { turmaId: '1' } }));
    expect(next).toHaveBeenCalledWith();
  });

  test('requireTurmaAccess: professor não vinculado recebe 403', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const next = await executar(requireTurmaAccess, reqCom('professor', { params: { turmaId: '1' } }));
    expect(next.mock.calls[0][0].status).toBe(403);
  });
});
