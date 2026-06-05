const rateLimit = require('express-rate-limit');

// Limita tentativas de login para mitigar brute-force.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).render('login', {
      titulo: 'Login',
      erro: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
    });
  },
});

module.exports = { loginLimiter };
