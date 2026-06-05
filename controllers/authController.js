const argon2 = require('argon2');
const pool = require('../config/db');
const { asyncHandler } = require('../middleware/asyncHandler');

const login = asyncHandler(async (req, res) => {
  const { email, senha } = req.body;

  const result = await pool.query(
    'SELECT * FROM usuarios WHERE email = $1 AND ativo = true',
    [email]
  );

  const credenciaisInvalidas = () =>
    res.status(401).render('login', { titulo: 'Login', erro: 'Email ou senha incorretos' });

  if (result.rows.length === 0) {
    return credenciaisInvalidas();
  }

  const usuario = result.rows[0];
  const senhaValida = await argon2.verify(usuario.senha, senha);

  if (!senhaValida) {
    return credenciaisInvalidas();
  }

  req.session.usuario = {
    id: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    tipo: usuario.tipo,
  };

  const redirectUrl = usuario.tipo === 'admin' ? '/admin/dashboard' : '/professor/dashboard';
  res.redirect(redirectUrl);
});

const logout = (req, res) => {
  req.session.destroy((erro) => {
    if (erro) {
      console.error('Erro ao fazer logout:', erro);
    }
    res.redirect('/');
  });
};

module.exports = {
  login,
  logout,
};
