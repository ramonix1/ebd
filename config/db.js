const { Pool } = require('pg');
require('dotenv').config();

const emProducao = process.env.NODE_ENV === 'production';

// SSL (Supabase): ligado em produção ou com PGSSL=require; PGSSL=disable desliga.
const usarSsl =
  process.env.PGSSL === 'disable' ? false : emProducao || process.env.PGSSL === 'require';

// Tamanho do pool: PG_POOL_MAX, senão 20 local / 10 em produção (pooler do Supabase free).
const poolMax = parseInt(process.env.PG_POOL_MAX, 10) || (emProducao ? 10 : 20);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: usarSsl ? { rejectUnauthorized: false } : false,
  max: poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Erro inesperado no pool de conexões:', err);
});

module.exports = pool;
