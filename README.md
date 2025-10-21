# 🦁 JARVIS CRM - Backend API

API completa para gerenciamento de CRM para corretores de seguros.

## 🚀 Features

- ✅ Multi-tenant (isolamento completo por empresa)
- ✅ Autenticação JWT
- ✅ CRUD completo de Clientes
- ✅ Gestão de Propostas com Funil Kanban
- ✅ Agenda e Follow-ups
- ✅ Dashboard com estatísticas
- ✅ Importação em massa (Excel/CSV)
- ✅ Logs de auditoria
- ✅ 8 Produtos padrão de seguros

## 📋 Requisitos

- Node.js 18+
- PostgreSQL 14+

## 🔧 Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Rodar migrations
npm run db:migrate

# Iniciar servidor
npm start

# Desenvolvimento (com watch)
npm run dev
```

## 📝 Variáveis de Ambiente

```env
DATABASE_URL=postgresql://user:password@host:5432/jarvis_crm
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
PORT=5000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
```

## 🛣️ Endpoints

### Autenticação

```
POST /api/auth/register    - Registrar novo usuário e tenant
POST /api/auth/login       - Login
GET  /api/auth/me          - Verificar token
```

### Clientes

```
GET    /api/clients             - Listar clientes
GET    /api/clients/:id         - Buscar cliente
POST   /api/clients             - Criar cliente
PUT    /api/clients/:id         - Atualizar cliente
DELETE /api/clients/:id         - Deletar cliente
POST   /api/clients/import/bulk - Importação em massa
GET    /api/clients/stats/summary - Estatísticas
```

### Propostas

```
GET    /api/proposals           - Listar propostas
GET    /api/proposals/:id       - Buscar proposta
GET    /api/proposals/funnel    - Dados do funil
POST   /api/proposals           - Criar proposta
PUT    /api/proposals/:id       - Atualizar proposta
DELETE /api/proposals/:id       - Deletar proposta
GET    /api/proposals/stats/summary - Estatísticas
```

### Follow-ups

```
GET    /api/followups          - Listar follow-ups
GET    /api/followups/:id      - Buscar follow-up
GET    /api/followups/today    - Agenda do dia
GET    /api/followups/overdue  - Tarefas atrasadas
POST   /api/followups          - Criar follow-up
PUT    /api/followups/:id      - Atualizar follow-up
POST   /api/followups/:id/complete - Marcar como concluído
DELETE /api/followups/:id      - Deletar follow-up
GET    /api/followups/stats/summary - Estatísticas
```

### Dashboard

```
GET /api/dashboard      - Dashboard completo
GET /api/dashboard/kpis - KPIs principais
```

## 🗄️ Estrutura do Banco

- **tenants** - Empresas/Corretores
- **users** - Usuários do sistema
- **clients** - Clientes/Leads (PF/PJ)
- **products** - Produtos/Serviços
- **proposals** - Propostas de venda
- **followups** - Tarefas/Agenda
- **activities** - Logs de auditoria
- **documents** - Arquivos anexados
- **email_campaigns** - Campanhas de email
- **whatsapp_messages** - Mensagens WhatsApp

## 🔒 Segurança

- JWT com expiração de 24h
- Senhas com bcrypt (cost 10)
- Multi-tenant isolation
- SQL injection prevention
- CORS configurado
- Rate limiting (futuro)

## 📊 Status

✅ Versão 1.0 - MVP Funcional
- Core CRUD completo
- Autenticação funcionando
- Multi-tenant OK
- Dashboard básico

## 🚀 Deploy

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Railway

```bash
# Install Railway CLI
npm i -g railway

# Deploy
railway up
```

## 👨‍💻 Desenvolvedor

Claude (Anthropic) para Lions Corretora
