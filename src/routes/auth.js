import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { generateToken } from '../config/auth.js';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import Activity from '../models/Activity.js';

const router = express.Router();

// Registro (criar conta + tenant)
router.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('company_name').trim().notEmpty().withMessage('Company name is required'),
    validate
  ],
  async (req, res) => {
    try {
      const { name, email, password, company_name, cnpj, phone } = req.body;
      
      // Verificar se email já existe
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          error: 'Email already registered'
        });
      }
      
      // Criar subdomain baseado no nome da empresa
      const subdomain = company_name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 50);
      
      // Criar tenant
      const tenant = await Tenant.create({
        name: company_name,
        subdomain: subdomain + '-' + Date.now(),
        cnpj,
        plan: 'free'
      });
      
      // Criar produtos padrão para o tenant
      await Tenant.createDefaultProducts(tenant.id);
      
      // Criar usuário admin
      const user = await User.create({
        tenant_id: tenant.id,
        email,
        password,
        name,
        phone,
        role: 'admin'
      });
      
      // Log de atividade
      await Activity.logCreate(tenant.id, user.id, 'user', user.id, {
        action: 'registered',
        email: user.email
      });
      
      // Gerar token
      const token = generateToken({
        userId: user.id,
        tenantId: tenant.id,
        role: user.role
      });
      
      res.status(201).json({
        message: 'Registration successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain
        }
      });
      
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: error.message
      });
    }
  }
);

// Login
router.post('/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Autenticar usuário
      const user = await User.authenticate(email, password);
      
      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials'
        });
      }
      
      // Buscar tenant
      const tenant = await Tenant.findById(user.tenant_id);
      
      if (!tenant || !tenant.active) {
        return res.status(403).json({
          error: 'Account inactive or suspended'
        });
      }
      
      // Log de atividade
      await Activity.create(tenant.id, user.id, {
        entity_type: 'user',
        entity_id: user.id,
        action: 'login',
        details: { email: user.email },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
      // Gerar token
      const token = generateToken({
        userId: user.id,
        tenantId: tenant.id,
        role: user.role
      });
      
      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          logo_url: tenant.logo_url,
          primary_color: tenant.primary_color
        }
      });
      
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: error.message
      });
    }
  }
);

// Verificar token (rota protegida de teste)
router.get('/me',
  async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
      }
      
      const token = authHeader.split(' ')[1];
      const { verifyToken } = await import('../config/auth.js');
      const decoded = verifyToken(token);
      
      const user = await User.findById(decoded.userId);
      const tenant = await Tenant.findById(decoded.tenantId);
      
      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain
        }
      });
      
    } catch (error) {
      res.status(401).json({
        error: 'Invalid token',
        message: error.message
      });
    }
  }
);

export default router;
