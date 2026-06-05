const { validationResult } = require('express-validator');
const { loginRules, usuarioCreateRules, turmaRules } = require('../../middleware/validators');

async function rodar(rules, body) {
  const req = { body };
  for (const rule of rules) {
    await rule.run(req);
  }
  return validationResult(req);
}

describe('regras de validação', () => {
  test('login: e-mail inválido falha', async () => {
    const res = await rodar(loginRules, { email: 'invalido', senha: '123' });
    expect(res.isEmpty()).toBe(false);
  });

  test('login: dados válidos passam', async () => {
    const res = await rodar(loginRules, { email: 'a@b.com', senha: '123' });
    expect(res.isEmpty()).toBe(true);
  });

  test('usuário: senha curta falha', async () => {
    const res = await rodar(usuarioCreateRules, {
      nome: 'Fulano', email: 'a@b.com', tipo: 'professor', senha: '123',
    });
    expect(res.isEmpty()).toBe(false);
  });

  test('usuário: tipo inválido falha', async () => {
    const res = await rodar(usuarioCreateRules, {
      nome: 'Fulano', email: 'a@b.com', tipo: 'root', senha: '123456',
    });
    expect(res.isEmpty()).toBe(false);
  });

  test('turma: trimestre inválido falha', async () => {
    const res = await rodar(turmaRules, {
      nome: 'Turma', dia_semana: 'domingo', horario_inicio: '09:00', horario_fim: '10:00', trimestre: '9',
    });
    expect(res.isEmpty()).toBe(false);
  });

  test('turma: dados válidos passam', async () => {
    const res = await rodar(turmaRules, {
      nome: 'Turma', dia_semana: 'domingo', horario_inicio: '09:00', horario_fim: '10:00', trimestre: '2',
    });
    expect(res.isEmpty()).toBe(true);
  });
});
