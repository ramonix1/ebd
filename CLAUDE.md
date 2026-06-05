# EBD - Escola Bíblica Dominical

Projeto de sistema de gestão para Escola Bíblica Dominical.

## Stack Tecnológico

- **Runtime:** Node.js 18+
- **Framework:** Express.js 5.2+
- **Banco de Dados:** PostgreSQL 14+
- **Template Engine:** EJS
- **CSS:** Bootstrap 5.3 + Custom CSS
- **Ícones:** Bootstrap Icons (via CDN)
- **Segurança:** Helmet, Argon2, Session storage

## Arquitetura

```
EBD/
├── config/db.js                 # Configuração do pool PostgreSQL
├── controllers/                 # Lógica de negócio
│   └── authController.js       # Login/Logout
├── routes/                      # Definição de rotas
│   ├── publicRoutes.js         # Rotas públicas (login, home)
│   ├── adminRoutes.js          # Rotas admin (requer permissão)
│   └── professorRoutes.js      # Rotas professor
├── middleware/
│   ├── authMiddleware.js       # Autenticação, permissões e acesso a turma (IDOR)
│   ├── csrfMiddleware.js       # Token CSRF por sessão (synchronizer token)
│   ├── flashMiddleware.js      # Mensagens flash (sucesso/erro) via sessão
│   ├── rateLimitMiddleware.js  # Rate limit no login (anti brute-force)
│   ├── validators.js           # Regras de validação (express-validator)
│   ├── asyncHandler.js         # Wrapper de erros + httpError
│   └── uploadMiddleware.js     # Upload de foto de perfil (multer)
├── views/                       # Templates EJS
│   ├── partials/               # Header/Footer reutilizáveis
│   ├── login.ejs              # Página de login
│   ├── index.ejs              # Home pública
│   ├── admin/                 # Pages do administrador
│   │   ├── dashboard.ejs
│   │   ├── turmas/            # CRUD de turmas
│   │   ├── alunos/            # CRUD de alunos
│   │   ├── usuarios/          # CRUD de usuários
│   │   └── relatorios/        # Relatórios
│   └── professor/             # Pages do professor
│       ├── dashboard.ejs
│       ├── turmas.ejs
│       ├── alunos.ejs
│       └── frequencia/        # Registrar/listar frequência
├── public/
│   ├── css/style.css          # CSS customizado
│   └── js/main.js             # JavaScript comum
├── database/
│   ├── schema.sql             # Schema completo + índices
│   └── migrations/            # Migrations versionadas (.sql)
├── scripts/
│   ├── seed-admin.js          # Script para criar admin inicial
│   └── migrate.js             # Runner de migrations (npm run migrate)
└── server.js                  # Entry point
```

## Banco de Dados

### Tabelas Principais

- **usuarios** — Admin e professores
- **turmas** — Classes/turmas da escola
- **turma_professores** — Relação N:N (turmas ↔ professores)
- **alunos** — Dados dos alunos
- **matriculas** — Inscrição de alunos em turmas por trimestre
- **frequencia** — Registros de presença

### Nomenclatura

Todos os bancos devem seguir o padrão `icaseweb_*`:
- Banco atual: `icaseweb_ebd`

### Restrições de Segurança

- Nenhuma operação DML/DDL além de SELECT (se usar MCP)
- Senhas hasheadas com Argon2
- Sessions em PostgreSQL (nunca na memória)
- Prepared statements por padrão (pg client)

## Autenticação e Autorização

### Flow de Login

1. Usuário entra email + senha em `/login`
2. Controller valida contra tabela `usuarios`
3. Senha verificada com `argon2.verify()`
4. Session criada em PostgreSQL se válido
5. Redireciona para dashboard (admin ou professor)

### Proteção de Routes

```javascript
// Middleware aplicado em rotas
router.use(requireAuth)    // Verifica session.usuario
router.use(requireAdmin)   // Verifica usuario.tipo === 'admin'
router.use(requireProfessor) // Verifica professor ou admin
```

## Desenvolvimento

### Primeira Execução

```bash
cd /home/itarget/EBD
npm install
npm start
# Acesse http://localhost:3000
```

### Setup do Banco

```bash
psql -U postgres -c "CREATE DATABASE icaseweb_ebd;"
psql -U postgres -d icaseweb_ebd -f database/schema.sql
npm run seed       # cria o admin inicial

# Para um banco já existente (criado com schema antigo), aplique as migrations:
npm run migrate    # idempotente; registra o que já foi aplicado em schema_migrations
```

### Usuário Padrão

- Email: `admin@ebd.com`
- Senha: `admin123`
- **Mude após primeiro login**

## Convenções

### Código

- **Controllers** — Lógica de negócio, queries diretas com `pool.query()`
- **Routes** — Apenas routing e middleware; lógica → controllers
- **Views** — EJS com Bootstrap Icons (`<i class="bi bi-*"></i>`)
- **CSS** — Preferir Bootstrap; apenas custom onde necessário
- **JS** — Vanilla JS; sem frameworks no cliente (por simplicidade)

### Nomes

- Variáveis: `camelCase`
- Arquivos: `kebab-case` para múltiplas palavras
- Banco: `snake_case`
- Rotas: `/recurso/acao` ou `/recurso/:id/acao`

## Segurança (implementado)

- **CSRF** — token por sessão em todos os formulários (`_csrf`); rotas multipart validam após o multer
- **Autorização de turma** — `requireTurmaAccess` impede professor de acessar turma de outro (IDOR)
- **Rate limit** — 10 tentativas/15min no login
- **Logout** — via `POST /logout` (não mais GET)
- **SESSION_SECRET** — obrigatório em produção (boot aborta sem ele)
- **Cookie** — `httpOnly` + `sameSite: 'lax'`

## Próximas Funcionalidades

1. **API Endpoints** — JSON responses para operações assíncronas
2. **Paginação** — Listas com limit/offset
3. **Relatórios** — PDF via pdfkit ou similar
4. **Email** — Notificações via Nodemailer
5. **Testes de integração** — ampliar cobertura (Supertest) além dos unitários atuais
6. **Camada de serviços** — extrair queries repetidas dos controllers

## Performance

- Índices criados em PKs, FKs e colunas frequentes
- Max 20 conexões no pool PostgreSQL
- Static files com cache header (1 dia)
- Sessões com TTL de 24h

## Troubleshooting

**Banco não conecta?**
```bash
psql -U postgres -d icaseweb_ebd -c "SELECT 1"
```

**Usuário já existe ao rodar seed?**
Remova e recrie a DB:
```bash
dropdb icaseweb_ebd
createdb icaseweb_ebd
psql -U postgres -d icaseweb_ebd -f database/schema.sql
npm run seed
```

**Session não persiste?**
Certifique-se que a tabela `session` foi criada:
```sql
SELECT * FROM information_schema.tables WHERE table_name = 'session';
```

## Referências

- [Express.js Docs](https://expressjs.com/)
- [EJS Syntax](https://ejs.co/)
- [Bootstrap 5 Docs](https://getbootstrap.com/docs/5.3/)
- [Bootstrap Icons](https://icons.getbootstrap.com/)
- [PostgreSQL Node.js](https://node-postgres.com/)
