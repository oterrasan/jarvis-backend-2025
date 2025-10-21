import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { authenticate, tenantIsolation } from '../middleware/auth.js';
import Followup from '../models/Followup.js';
import Activity from '../models/Activity.js';

const router = express.Router();

router.use(authenticate, tenantIsolation);

// Listar follow-ups
router.get('/', async (req, res) => {
  try {
    const result = await Followup.list(req.tenantId, req.query);
    res.json(result);
  } catch (error) {
    console.error('Error listing followups:', error);
    res.status(500).json({ error: 'Failed to list followups' });
  }
});

// Agenda do dia
router.get('/today', async (req, res) => {
  try {
    const agenda = await Followup.getTodayAgenda(req.tenantId, req.user.id);
    res.json(agenda);
  } catch (error) {
    console.error('Error fetching today agenda:', error);
    res.status(500).json({ error: 'Failed to fetch today agenda' });
  }
});

// Tarefas atrasadas
router.get('/overdue', async (req, res) => {
  try {
    const overdue = await Followup.getOverdue(req.tenantId, req.user.id);
    res.json(overdue);
  } catch (error) {
    console.error('Error fetching overdue tasks:', error);
    res.status(500).json({ error: 'Failed to fetch overdue tasks' });
  }
});

// Buscar follow-up por ID
router.get('/:id', async (req, res) => {
  try {
    const followup = await Followup.findById(req.params.id, req.tenantId);
    
    if (!followup) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }
    
    res.json(followup);
  } catch (error) {
    console.error('Error fetching followup:', error);
    res.status(500).json({ error: 'Failed to fetch follow-up' });
  }
});

// Criar follow-up
router.post('/',
  [
    body('type').isIn(['call', 'email', 'meeting', 'visit', 'whatsapp', 'other']),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('due_date').isISO8601().withMessage('Valid due date is required'),
    validate
  ],
  async (req, res) => {
    try {
      const followup = await Followup.create(req.tenantId, req.body, req.user.id);
      
      await Activity.logCreate(req.tenantId, req.user.id, 'followup', followup.id, {
        title: followup.title,
        due_date: followup.due_date
      });
      
      res.status(201).json(followup);
    } catch (error) {
      console.error('Error creating followup:', error);
      res.status(500).json({ error: 'Failed to create follow-up' });
    }
  }
);

// Atualizar follow-up
router.put('/:id', async (req, res) => {
  try {
    const followup = await Followup.update(req.params.id, req.tenantId, req.body);
    
    if (!followup) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }
    
    await Activity.logUpdate(req.tenantId, req.user.id, 'followup', followup.id, {
      updated_fields: Object.keys(req.body)
    });
    
    res.json(followup);
  } catch (error) {
    console.error('Error updating followup:', error);
    res.status(500).json({ error: 'Failed to update follow-up' });
  }
});

// Marcar como concluído
router.post('/:id/complete',
  [
    body('result').optional().trim(),
    validate
  ],
  async (req, res) => {
    try {
      const followup = await Followup.complete(req.params.id, req.tenantId, req.body.result);
      
      if (!followup) {
        return res.status(404).json({ error: 'Follow-up not found' });
      }
      
      await Activity.create(req.tenantId, req.user.id, {
        entity_type: 'followup',
        entity_id: followup.id,
        action: 'completed',
        details: { result: req.body.result }
      });
      
      res.json(followup);
    } catch (error) {
      console.error('Error completing followup:', error);
      res.status(500).json({ error: 'Failed to complete follow-up' });
    }
  }
);

// Deletar follow-up
router.delete('/:id', async (req, res) => {
  try {
    const followup = await Followup.delete(req.params.id, req.tenantId);
    
    if (!followup) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }
    
    await Activity.logDelete(req.tenantId, req.user.id, 'followup', req.params.id, {
      title: followup.title
    });
    
    res.json({ message: 'Follow-up deleted successfully' });
  } catch (error) {
    console.error('Error deleting followup:', error);
    res.status(500).json({ error: 'Failed to delete follow-up' });
  }
});

// Estatísticas
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await Followup.getStats(req.tenantId, req.user.id);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
