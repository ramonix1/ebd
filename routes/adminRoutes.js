const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const {
  validar,
  usuarioCreateRules,
  usuarioUpdateRules,
  professorCreateRules,
  professorUpdateRules,
  alunoRules,
  turmaRules,
} = require('../middleware/validators');
const turmaController = require('../controllers/turmaController');
const alunoController = require('../controllers/alunoController');
const usuarioController = require('../controllers/usuarioController');
const professorController = require('../controllers/professorController');
const dashboardController = require('../controllers/dashboardController');
const matriculaController = require('../controllers/matriculaController');
const minhasTurmasController = require('../controllers/professorMinhasTurmasController');

// Todos os routes admin requerem autenticação e permissão admin
router.use(requireAuth);
router.use(requireAdmin);

// Dashboard admin
router.get('/dashboard', dashboardController.adminDashboard);

// ==================== TURMAS ====================
// Rotas específicas ANTES de dinâmicas
router.get('/turmas/novo', turmaController.formularioNovo);
router.get('/turmas/operacional', minhasTurmasController.minhasTurmas);
router.get('/turmas/:id/editar', turmaController.editar);
router.post('/turmas/:id/deletar', turmaController.deletar);
router.post('/turmas/:id', turmaRules, validar, turmaController.atualizar);
router.get('/turmas', turmaController.listar);
router.post('/turmas', turmaRules, validar, turmaController.criar);

// ==================== MATRÍCULAS ====================
router.get('/turmas/:turmaId/alunos', matriculaController.listarAlunosDaTurma);
router.get('/turmas/:turmaId/matriculas', matriculaController.listarPorTurma);
router.post('/turmas/:turmaId/matriculas/adicionar', matriculaController.adicionarAluno);
router.post('/turmas/:turmaId/matriculas/remover', matriculaController.removerAluno);

// ==================== ALUNOS ====================
// Rotas específicas ANTES de dinâmicas
router.get('/alunos/novo', alunoController.formularioNovo);
router.get('/alunos/:id/editar', alunoController.editar);
router.post('/alunos/:id/deletar', alunoController.deletar);
router.post('/alunos/:id', alunoRules, validar, alunoController.atualizar);
router.get('/alunos', alunoController.listar);
router.post('/alunos', alunoRules, validar, alunoController.criar);

// ==================== USUÁRIOS ====================
// Rotas específicas ANTES de dinâmicas
router.get('/usuarios/novo', usuarioController.formularioNovo);
router.get('/usuarios/:id/editar', usuarioController.editar);
router.post('/usuarios/:id/deletar', usuarioController.deletar);
router.post('/usuarios/:id', usuarioUpdateRules, validar, usuarioController.atualizar);
router.get('/usuarios', usuarioController.listar);
router.post('/usuarios', usuarioCreateRules, validar, usuarioController.criar);

// ==================== PROFESSORES ====================
// Rotas específicas ANTES de dinâmicas
router.get('/professores/novo', professorController.formularioNovo);
router.get('/professores/supervisao', professorController.supervisao);
router.get('/professores/:id/editar', professorController.editar);
router.post('/professores/:id/deletar', professorController.deletar);
router.post('/professores/:id', professorUpdateRules, validar, professorController.atualizar);
router.get('/professores/:professorId/dashboard-supervisao', professorController.dashboardSupervisao);
router.get('/professores', professorController.listar);
router.post('/professores', professorCreateRules, validar, professorController.criar);

// ==================== RELATÓRIOS ====================
router.get('/relatorios', (req, res) => {
  res.render('admin/relatorios/index', { titulo: 'Relatórios' });
});

module.exports = router;
