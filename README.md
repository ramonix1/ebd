# EBD - Escola Bíblica Dominical

Sistema de gestão para Escola Bíblica Dominical com controle de turmas, alunos, frequência e matrículas.

## Requisitos

- **Node.js** 18+
- **PostgreSQL** 14+
- **npm** ou **pnpm**

## Instalação

### 1. Clonar/Preparar o projeto

```bash
cd /home/itarget/EBD
npm install
```

### 2. Configurar o banco de dados

```bash
# Criar banco de dados
psql -U postgres -c "CREATE DATABASE icaseweb_ebd;"

# Carregar schema
psql -U postgres -d icaseweb_ebd -f database/schema.sql
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```
NODE_ENV=development
DATABASE_URL=postgresql://usuario:senha@localhost:5432/icaseweb_ebd
SESSION_SECRET=gere_uma_chave_aleatoria_muito_longa_aqui
PORT=3000
HOST=localhost
```

### 4. Criar usuário administrador inicial

Execute o script de seed para criar um usuário admin padrão:

```bash
node scripts/seed-admin.js
```

**Credenciais padrão:**
- Email: `admin@ebd.com`
- Senha: `admin123`

> ⚠️ **Importante:** Altere a senha do admin após o primeiro login.

## Desenvolvimento

### Iniciar servidor

```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`

### Modo de desenvolvimento com nodemon

```bash
npm run dev
```

### Rodas testes

```bash
npm test
npm run test:watch
```

## Estrutura do Projeto

```
EBD/
├── config/              # Configurações (banco de dados)
├── controllers/         # Lógica de negócio
├── routes/             # Definição de rotas
├── middleware/         # Middlewares (autenticação, validação)
├── views/              # Templates EJS
│   ├── admin/          # Pages do admin
│   ├── professor/      # Pages do professor
│   └── partials/       # Componentes reutilizáveis
├── public/             # Assets estáticos
│   ├── css/
│   └── js/
├── database/           # Schema SQL e scripts
├── server.js           # Arquivo principal
└── package.json
```

## Funcionalidades Principais

### Para Administrador

- 📊 Dashboard com estatísticas
- 🏫 Gestão de turmas
- 👥 Gestão de alunos e matrículas
- 👤 Gestão de usuários (admin e professores)
- 📈 Relatórios de frequência

### Para Professor

- 📊 Dashboard personalizado
- 🏫 Visualizar suas turmas
- ✅ Registrar frequência
- 👥 Visualizar alunos de suas turmas
- 📋 Histórico de frequência

## Tecnologias Utilizadas

- **Backend:** Express.js, PostgreSQL
- **Frontend:** EJS (Server-side rendering), Bootstrap 5
- **Ícones:** Bootstrap Icons
- **Autenticação:** Argon2 (hash de senhas)
- **Segurança:** Helmet, CSRF protection
- **Session:** express-session com PostgreSQL

## Variáveis de Ambiente

```
NODE_ENV              # development | production
DATABASE_URL          # Connection string do PostgreSQL
SESSION_SECRET        # Chave para encrypt sessions (mínimo 32 caracteres)
PORT                  # Porta do servidor (default: 3000)
HOST                  # Host do servidor (default: localhost)
```

## Segurança

- Senhas são criptografadas com Argon2
- Sessions são armazenadas no banco PostgreSQL
- CSRF protection em formulários
- Prepared statements para prevenir SQL injection
- Helmet para headers de segurança
- HTTPS recomendado em produção

## Troubleshooting

### Erro de conexão com banco de dados

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solução:** Verifique se PostgreSQL está rodando:
```bash
sudo systemctl start postgresql
```

### Sessão não persiste

Verifique se o banco de dados foi criado corretamente:
```bash
psql -U postgres -d icaseweb_ebd -c "SELECT * FROM session;"
```

### Porta já em uso

Mude a porta no arquivo `.env`:
```
PORT=3001
```

## Próximos Passos

1. Implementar controllers para CRUD de turmas, alunos, etc.
2. Adicionar validações de formulário no frontend
3. Criar endpoints de API para operações assíncronas
4. Implementar relatórios em PDF
5. Adicionar notificações por email
6. Criar sistema de backup automático

## Suporte

Para dúvidas ou problemas, consulte a documentação em CLAUDE.md

## Licença

MIT
