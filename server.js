require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Rotas
const authRoutes = require('./src/routes/auth');
const clientRoutes = require('./src/routes/clients');
const proposalRoutes = require('./src/routes/proposals');
const followupRoutes = require('./src/routes/followups');
const dashboardRoutes = require('./src/routes/dashboard');

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Start
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
