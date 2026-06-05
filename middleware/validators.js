const { body, validationResult } = require('express-validator');

// Executa as validações: em caso de erro, registra flash e volta ao formulário.
const validar = (req, res, next) => {
  const erros = validationResult(req);
  if (erros.isEmpty()) return next();
  req.flash('erro', erros.array()[0].msg);
  return res.redirect(req.get('Referrer') || req.originalUrl);
};

const TRIMESTRES = ['1', '2', '3', '4'];

const loginRules = [
  body('email').trim().isEmail().withMessage('Informe um e-mail válido'),
  body('senha').notEmpty().withMessage('Senha é obrigatória'),
];

const usuarioCreateRules = [
  body('nome').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('email').trim().isEmail().withMessage('Informe um e-mail válido'),
  body('tipo').isIn(['admin', 'professor']).withMessage('Tipo inválido'),
  body('senha').isLength({ min: 6 }).withMessage('A senha deve ter ao menos 6 caracteres'),
  body('senha_confirmacao')
    .optional({ checkFalsy: true })
    .custom((valor, { req }) => valor === req.body.senha)
    .withMessage('As senhas não conferem'),
];

const usuarioUpdateRules = [
  body('nome').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('tipo').isIn(['admin', 'professor']).withMessage('Tipo inválido'),
  body('senha').optional({ checkFalsy: true }).isLength({ min: 6 }).withMessage('A senha deve ter ao menos 6 caracteres'),
];

const professorCreateRules = [
  body('nome').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('email').trim().isEmail().withMessage('Informe um e-mail válido'),
  body('senha').isLength({ min: 6 }).withMessage('A senha deve ter ao menos 6 caracteres'),
  body('telefone').optional({ checkFalsy: true }).trim(),
];

const professorUpdateRules = [
  body('nome').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('senha').optional({ checkFalsy: true }).isLength({ min: 6 }).withMessage('A senha deve ter ao menos 6 caracteres'),
  body('telefone').optional({ checkFalsy: true }).trim(),
];

const alunoRules = [
  body('nome').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('email_responsavel').optional({ checkFalsy: true }).isEmail().withMessage('E-mail do responsável inválido'),
];

const turmaRules = [
  body('nome').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('dia_semana').trim().notEmpty().withMessage('Dia da semana é obrigatório'),
  body('horario_inicio').notEmpty().withMessage('Horário de início é obrigatório'),
  body('horario_fim').notEmpty().withMessage('Horário de fim é obrigatório'),
  body('trimestre').isIn(TRIMESTRES).withMessage('Trimestre inválido'),
];

const perfilRules = [
  body('nome').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('senha').optional({ checkFalsy: true }).isLength({ min: 6 }).withMessage('A senha deve ter ao menos 6 caracteres'),
];

module.exports = {
  validar,
  loginRules,
  usuarioCreateRules,
  usuarioUpdateRules,
  professorCreateRules,
  professorUpdateRules,
  alunoRules,
  turmaRules,
  perfilRules,
};
