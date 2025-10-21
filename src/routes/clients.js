import express from 'express';
import { body, query as queryValidator } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { authenticate, tenantIsolation } from '../middleware/auth.js';
import Client from '../models/Client.js';
import Activity from '../models/Activity.js';

const router = express.Router();

// Aplicar autenticação e isolamento em todas as rotas
router.use(authenticate, tenantIsolation);

// Listar clientes
router.get('/',
  [
    queryValidator('search').optional().trim(),
    queryValidator('type').optional().isIn(['PF', 'PJ']),
    queryValidator('status').optional(),
    queryValidator('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    queryValidator('offset').optional().isInt({ min: 0 }).toInt(),
    validate
  ],
  async (req, res) => {
    try {
      const result = await Client.list(req.tenantId, req.query);
      res.json(result);
    } catch (error) {
      console.error('Error listing clients:', error);
      res.status(500).json({ error: 'Failed to list clients' });
    }
  }
);

// Buscar cliente por ID
router.get('/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id, req.tenantId);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    res.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// Criar cliente
router.post('/',
  [
    body('type').isIn(['PF', 'PJ']).withMessage('Type must be PF or PJ'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('document').trim().notEmpty().withMessage('Document (CPF/CNPJ) is required'),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().trim(),
    validate
  ],
  async (req, res) => {
    try {
      // Verificar se documento já existe
      const existing = await Client.findByDocument(req.body.document, req.tenantId);
      if (existing) {
        return res.status(409).json({
          error: 'Client with this document already exists',
          existingClient: { id: existing.id, name: existing.name }
        });
      }
      
      const client = await Client.create(req.tenantId, req.body, req.user.id);
      
      // Log de atividade
      await Activity.logCreate(req.tenantId, req.user.id, 'client', client.id, {
        name: client.name,
        document: client.document
      });
      
      res.status(201).json(client);
    } catch (error) {
      console.error('Error creating client:', error);
      res.status(500).json({ error: 'Failed to create client' });
    }
  }
);

// Atualizar cliente
router.put('/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
    validate
  ],
  async (req, res) => {
    try {
      const client = await Client.update(req.params.id, req.tenantId, req.body);
      
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      // Log de atividade
      await Activity.logUpdate(req.tenantId, req.user.id, 'client', client.id, {
        updated_fields: Object.keys(req.body)
      });
      
      res.json(client);
    } catch (error) {
      console.error('Error updating client:', error);
      res.status(500).json({ error: 'Failed to update client' });
    }
  }
);

// Deletar cliente
router.delete('/:id', async (req, res) => {
  try {
    const client = await Client.delete(req.params.id, req.tenantId);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Log de atividade
    await Activity.logDelete(req.tenantId, req.user.id, 'client', req.params.id, {
      name: client.name,
      document: client.document
    });
    
    res.json({ message: 'Client deleted successfully', client });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// Importação em massa
router.post('/import/bulk',
  [
    body('clients').isArray({ min: 1 }).withMessage('Clients array is required'),
    body('clients.*.type').isIn(['PF', 'PJ']),
    body('clients.*.name').trim().notEmpty(),
    body('clients.*.document').trim().notEmpty(),
    validate
  ],
  async (req, res) => {
    try {
      const result = await Client.bulkCreate(req.tenantId, req.body.clients, req.user.id);
      
      // Log de atividade
      await Activity.create(req.tenantId, req.user.id, {
        entity_type: 'client',
        entity_id: null,
        action: 'bulk_import',
        details: {
          total: req.body.clients.length,
          success: result.success,
          failed: result.failed
        }
      });
      
      res.json({
        message: 'Bulk import completed',
        ...result
      });
    } catch (error) {
      console.error('Error importing clients:', error);
      res.status(500).json({ error: 'Failed to import clients' });
    }
  }
);

// Estatísticas
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await Client.getStats(req.tenantId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
