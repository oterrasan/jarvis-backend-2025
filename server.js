import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler, requestLogger } from './src/middleware/validation.js';

// Importar rotas
import authRoutes from './src/routes/auth.js';
import clientRoutes from './src/routes/clients.js';
import proposalRoutes from './src/routes/proposals.js';
import followupRoutes from './src/routes/followups.js';
import dashboardRoutes from './src/routes/dashboard.js';

// Configuração
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['https://jarvis-crm-2025.vercel.app', /vercel\.app$/],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Info
app.get('/', (req, res) => {
  res.json({
    name: 'Jarvis CRM API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      clients: '/api/clients',
      proposals: '/api/proposals',
      followups: '/api/followups',
      dashboard: '/api/dashboard'
    }
  });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Error handler (deve ser o último middleware)
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║   🦁 JARVIS CRM API                                  ║
║                                                      ║
║   Status: ✅ RUNNING                                 ║
║   Port: ${PORT}                                        ║
║   Environment: ${process.env.NODE_ENV || 'development'}                        ║
║   Time: ${new Date().toLocaleString()}               ║
║                                                      ║
║   Endpoints:                                         ║
║   • POST   /api/auth/register                        ║
║   • POST   /api/auth/login                           ║
║   • GET    /api/clients                              ║
║   • POST   /api/clients                              ║
║   • GET    /api/proposals                            ║
║   • GET    /api/dashboard                            ║
║                                                      ║
║   Roberto, seu CRM está NO AR! 🚀                   ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
