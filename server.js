require('dotenv').config();
const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');
const pool = require('./config/db');
const flash = require('./middleware/flashMiddleware');
const { csrfToken, csrfProtection } = require('./middleware/csrfMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Em produção, exigir um SESSION_SECRET forte (nunca usar o fallback de dev).
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET é obrigatório em produção.');
  process.exit(1);
}

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      // Permite atributos de evento inline (onsubmit/onclick/onchange) usados nas
      // views, sem liberar blocos <script> inline.
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
      fontSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://cdn.jsdelivr.net'],
    },
  },
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files com cache
app.use(express.static('public', { maxAge: '1d' }));

// View engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Session configuration
app.use(session({
  store: new PgSession({
    pool: pool,
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24, // 24 horas
  },
}));

// Dados globais às views. Definido ANTES da proteção CSRF para que a página de
// erro (que inclui o header com `usuario`) renderize mesmo quando o CSRF rejeita.
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  next();
});

// Mensagens flash (sucesso/erro) via sessão
app.use(flash);

// Token CSRF disponível às views + proteção das requisições que alteram estado
app.use(csrfToken);
app.use(csrfProtection);

// Routes
app.use('/', require('./routes/publicRoutes'));
app.use('/admin', require('./routes/adminRoutes'));
app.use('/professor', require('./routes/professorRoutes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { titulo: 'Página não encontrada' });
});

// Error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  // Erros 5xx são logados; erros de cliente (4xx) não poluem o log.
  if (status >= 500) console.error('Erro:', err);

  // Mensagens de erros de cliente (403/404/etc.) são seguras para exibir.
  // Erros internos só expõem detalhes em desenvolvimento.
  const mensagem =
    status < 500
      ? err.message
      : process.env.NODE_ENV === 'development'
        ? err.message
        : 'Erro interno do servidor';

  res.status(status).render('error', { titulo: 'Erro', mensagem });
});

const server = app.listen(PORT, () => {
  console.log(`Servidor iniciado em http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido, encerrando...');
  server.close(() => {
    console.log('Servidor encerrado');
    pool.end();
    process.exit(0);
  });
});

module.exports = app;
