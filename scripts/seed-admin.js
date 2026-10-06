require('dotenv').config();
const argon2 = require('argon2');
const pool = require('../config/db');

async function seedAdmin() {
  try {
    console.log('Iniciando seed de usuário admin...');

    const email = process.env.ADMIN_EMAIL || 'admin@ebd.com';
    const senha = process.env.ADMIN_SENHA || 'admin123';
    const nome = process.env.ADMIN_NOME || 'Administrador';

    // Verificar se admin já existe
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );

    if (result.rows.length > 0) {
      console.log(`⚠️  Usuário admin já existe: ${email}`);
      await pool.end();
      return;
    }

    // Hash da senha
    const senhaHash = await argon2.hash(senha, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });

    // Inserir admin
    await pool.query(
      'INSERT INTO usuarios (email, senha, nome, tipo, ativo) VALUES ($1, $2, $3, $4, $5)',
      [email, senhaHash, nome, 'admin', true]
    );

    console.log('✅ Usuário admin criado com sucesso!');
    console.log('');
    console.log('Credenciais:');
    console.log(`  Email: ${email}`);
    console.log(`  Senha: ${process.env.ADMIN_SENHA ? '(definida em ADMIN_SENHA)' : senha}`);
    console.log('');
    console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');

    process.exit(0);
  } catch (erro) {
    console.error('❌ Erro ao criar usuário admin:', erro);
    process.exit(1);
  }
}

seedAdmin();
