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

// CORS - ACEITAR TUDO
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Handle preflight
app.options('*', cors());

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

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});

export default app;
