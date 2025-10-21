import express from 'express';
import { body, query as queryValidator } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { authenticate, tenantIsolation } from '../middleware/auth.js';
import Proposal from '../models/Proposal.js';
import Activity from '../models/Activity.js';

const router = express.Router();

router.use(authenticate, tenantIsolation);

// Listar propostas
router.get('/', async (req, res) => {
  try {
    const result = await Proposal.list(req.tenantId, req.query);
    res.json(result);
  } catch (error) {
    console.error('Error listing proposals:', error);
    res.status(500).json({ error: 'Failed to list proposals' });
  }
});

// Funil Kanban
router.get('/funnel', async (req, res) => {
  try {
    const data = await Proposal.getFunnelData(req.tenantId, req.query);
    res.json(data);
  } catch (error) {
    console.error('Error fetching funnel data:', error);
    res.status(500).json({ error: 'Failed to fetch funnel data' });
  }
});

// Buscar proposta por ID
router.get('/:id', async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id, req.tenantId);
    
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    res.json(proposal);
  } catch (error) {
    console.error('Error fetching proposal:', error);
    res.status(500).json({ error: 'Failed to fetch proposal' });
  }
});

// Criar proposta
router.post('/',
  [
    body('client_id').isUUID().withMessage('Valid client ID is required'),
    body('product_id').isUUID().withMessage('Valid product ID is required'),
    body('value').isFloat({ min: 0 }).withMessage('Value must be positive'),
    validate
  ],
  async (req, res) => {
    try {
      const proposal = await Proposal.create(req.tenantId, req.body, req.user.id);
      
      await Activity.logCreate(req.tenantId, req.user.id, 'proposal', proposal.id, {
        client_id: proposal.client_id,
        value: proposal.value
      });
      
      res.status(201).json(proposal);
    } catch (error) {
      console.error('Error creating proposal:', error);
      res.status(500).json({ error: 'Failed to create proposal' });
    }
  }
);

// Atualizar proposta
router.put('/:id', async (req, res) => {
  try {
    const proposal = await Proposal.update(req.params.id, req.tenantId, req.body);
    
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    await Activity.logUpdate(req.tenantId, req.user.id, 'proposal', proposal.id, {
      updated_fields: Object.keys(req.body)
    });
    
    res.json(proposal);
  } catch (error) {
    console.error('Error updating proposal:', error);
    res.status(500).json({ error: 'Failed to update proposal' });
  }
});

// Deletar proposta
router.delete('/:id', async (req, res) => {
  try {
    const proposal = await Proposal.delete(req.params.id, req.tenantId);
    
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    await Activity.logDelete(req.tenantId, req.user.id, 'proposal', req.params.id, {
      value: proposal.value
    });
    
    res.json({ message: 'Proposal deleted successfully' });
  } catch (error) {
    console.error('Error deleting proposal:', error);
    res.status(500).json({ error: 'Failed to delete proposal' });
  }
});

// Estatísticas
router.get('/stats/summary', async (req, res) => {
  try {
    const period = req.query.period || '30days';
    const stats = await Proposal.getStats(req.tenantId, period);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
