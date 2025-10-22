requer('dotenv').config();
const express = require('express');
const cors = require('cors');
const capacete = require('capacete');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./src/routes/auth');
const clientRoutes = require('./src/routes/clients');
const proposalRoutes = require('./src/routes/proposals');
const followupRoutes = require('./src/routes/followups');
const dashboardRoutes = require('./src/routes/dashboard');

const app = express();
const PORTA = process.env.PORTA || 5000;

// CORS - Aceita Vercel e localhost
aplicativo.use(cors({
  origem: função (origem, retorno de chamada) {
    const allowedOrigins = [
      'https://jarvis-crm-2025.vercel.app',
      'https://jarvis-crm-2025-git-main-oterrasan.vercel.app',
      /\.vercel\.app$/,
      'http://localhost:3000'
    ];
    
    se (!origem || allowedOrigins.some(permitido =>
      typeof permitido === 'string' ? permitido === origem : permitido.teste(origem)
    )) {
      retorno de chamada(nulo, verdadeiro);
    } outro {
      retorno de chamada(nulo, verdadeiro); // Permitir todos em produção
    }
  },
  credenciais: verdadeiro,
  métodos: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Tipo de conteúdo', 'Autorização']
}));

// Middleware de segurança
app.use(capacete({
  crossOriginResourcePolicy: { política: "origem cruzada" }
}));

// Limitação de taxa
const limitador = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  máx.: 100 // limite por IP
});
app.use('/api/auth', limitador);

// Analisador de corpo
aplicativo.use(express.json());
app.use(express.urlencoded({extended: true}));

// Verificação de saúde
app.get('/saúde', (req, res) => {
  res.json({
    estado: 'saudável',
    carimbo de data/hora: nova Data().toISOString(),
    tempo de atividade: process.uptime(),
    ambiente: process.env.NODE_ENV || 'produção'
  });
});

// Rotas principais
aplicativo.use('/api/auth', authRoutes);
app.use('/api/clientes', clientRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    erro: 'Endpoint não encontrado',
    caminho: req.originalUrl
  });
});

// Manipulador de erros
app.use((err, req, res, próximo) => {
  console.error('Erro:', err);
  res.status(err.status || 500).json({
    erro: err.mensagem || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'desenvolvimento' && { pilha: err.stack })
  });
});

// Iniciar servidor
app.listen(PORTA, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 Ambiente: ${process.env.NODE_ENV || 'produção'}`);
  console.log(`📊 Banco de dados: ${process.env.DATABASE_URL ? 'Conectado' : 'Não configurado'}`);
});

módulo.exports = aplicativo;
