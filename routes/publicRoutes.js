const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const perfilController = require('../controllers/perfilController');
const { requireAuth } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');
const { loginLimiter } = require('../middleware/rateLimitMiddleware');
const { validar, loginRules, perfilRules } = require('../middleware/validators');
const upload = require('../middleware/uploadMiddleware');

// Login
router.get('/login', (req, res) => {
  if (req.session.usuario) {
    const redirectUrl = req.session.usuario.tipo === 'admin' ? '/admin/dashboard' : '/professor/dashboard';
    return res.redirect(redirectUrl);
  }
  res.render('login', { titulo: 'Login' });
});

router.post('/login', loginLimiter, loginRules, validar, authController.login);

// Logout (GET com confirmação no botão)
router.get('/logout', authController.logout);

// Home - redireciona para dashboard ou login
router.get('/', (req, res) => {
  if (req.session.usuario) {
    const redirectUrl = req.session.usuario.tipo === 'admin' ? '/admin/dashboard' : '/professor/dashboard';
    return res.redirect(redirectUrl);
  }
  res.redirect('/login');
});

// Perfil - requer autenticação.
// A rota de atualização recebe multipart: o multer parseia o corpo e só então
// o token CSRF é validado (verifyCsrf) e as regras de validação aplicadas.
router.get('/perfil', requireAuth, perfilController.exibir);
router.post(
  '/perfil',
  requireAuth,
  upload.single('foto_perfil'),
  verifyCsrf,
  perfilRules,
  validar,
  perfilController.atualizar
);
router.post('/perfil/deletar-foto', requireAuth, perfilController.deletarFoto);

module.exports = router;
