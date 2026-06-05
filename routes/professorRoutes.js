const express = require('express');
const router = express.Router();
const { requireAuth, requireProfessor, requireTurmaAccess } = require('../middleware/authMiddleware');
const dashboardController = require('../controllers/dashboardController');
const frequenciaController = require('../controllers/frequenciaController');
const minhasTurmasController = require('../controllers/professorMinhasTurmasController');

// Todos os routes de professor requerem autenticação e permissão de professor
router.use(requireAuth);
router.use(requireProfessor);

// Dashboard professor
router.get('/dashboard', dashboardController.professorDashboard);

// Minhas turmas
router.get('/minhas-turmas', minhasTurmasController.minhasTurmas);

// Frequência (somente turmas do próprio professor; admin acessa todas)
router.get('/turma/:turmaId/frequencia', requireTurmaAccess, frequenciaController.listarFrequencia);
router.get('/turma/:turmaId/frequencia/registrar', requireTurmaAccess, frequenciaController.registrarFrequencia);
router.post('/turma/:turmaId/frequencia/salvar', requireTurmaAccess, frequenciaController.salvarFrequencia);

// Alunos da turma
router.get('/turma/:turmaId/alunos', requireTurmaAccess, (req, res) => {
  res.render('professor/alunos', { titulo: 'Alunos da Turma', turmaId: req.params.turmaId });
});

module.exports = router;
