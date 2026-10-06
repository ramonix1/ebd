require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

// Runner simples de migrations: executa, em ordem, os arquivos .sql de
// database/migrations que ainda não foram aplicados, registrando-os numa
// tabela de controle. Idempotente — rodar de novo não reaplica nada.
const MIGRATIONS_DIR = path.join(__dirname, '../database/migrations');

const SCHEMA_FILE = path.join(__dirname, '../database/schema.sql');

async function migrate() {
  // Banco novo e vazio: cria o schema base antes das migrations.
  const existe = await pool.query("SELECT to_regclass('public.usuarios') AS t");
  if (!existe.rows[0].t) {
    await pool.query(fs.readFileSync(SCHEMA_FILE, 'utf8'));
    console.log('✅ schema.sql aplicado (banco novo).');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      nome VARCHAR(255) PRIMARY KEY,
      aplicada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const aplicadas = new Set(
    (await pool.query('SELECT nome FROM schema_migrations')).rows.map((r) => r.nome)
  );

  const arquivos = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let executadas = 0;
  for (const arquivo of arquivos) {
    if (aplicadas.has(arquivo)) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, arquivo), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (nome) VALUES ($1)', [arquivo]);
      await client.query('COMMIT');
      console.log(`✅ ${arquivo}`);
      executadas++;
    } catch (erro) {
      await client.query('ROLLBACK');
      console.error(`❌ Falha em ${arquivo}:`, erro.message);
      throw erro;
    } finally {
      client.release();
    }
  }

  console.log(executadas === 0 ? 'Nenhuma migration pendente.' : `${executadas} migration(s) aplicada(s).`);
}

migrate()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
