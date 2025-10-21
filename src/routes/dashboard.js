import express from 'express';
import { authenticate, tenantIsolation } from '../middleware/auth.js';
import Client from '../models/Client.js';
import Proposal from '../models/Proposal.js';
import Followup from '../models/Followup.js';
import Activity from '../models/Activity.js';

const router = express.Router();

router.use(authenticate, tenantIsolation);

// Dashboard completo
router.get('/', async (req, res) => {
  try {
    const period = req.query.period || '30days';
    
    // Buscar todas as estatísticas em paralelo
    const [
      clientStats,
      proposalStats,
      followupStats,
      recentActivities,
      todayAgenda,
      overdueFollowups
    ] = await Promise.all([
      Client.getStats(req.tenantId),
      Proposal.getStats(req.tenantId, period),
      Followup.getStats(req.tenantId, req.user.id),
      Activity.getRecent(req.tenantId, { limit: 10 }),
      Followup.getTodayAgenda(req.tenantId, req.user.id),
      Followup.getOverdue(req.tenantId, req.user.id)
    ]);
    
    res.json({
      clients: clientStats,
      proposals: proposalStats,
      followups: followupStats,
      recent_activities: recentActivities,
      today_agenda: todayAgenda,
      overdue_followups: overdueFollowups,
      period
    });
    
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// KPIs principais
router.get('/kpis', async (req, res) => {
  try {
    const [clientStats, proposalStats] = await Promise.all([
      Client.getStats(req.tenantId),
      Proposal.getStats(req.tenantId, '30days')
    ]);
    
    res.json({
      total_clients: parseInt(clientStats.total),
      new_clients_month: parseInt(clientStats.new_this_month),
      total_proposals: parseInt(proposalStats.total),
      approved_proposals: parseInt(proposalStats.approved),
      total_revenue: parseFloat(proposalStats.total_approved_value || 0),
      total_commission: parseFloat(proposalStats.total_commission || 0),
      conversion_rate: parseFloat(proposalStats.conversion_rate || 0)
    });
    
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({ error: 'Failed to fetch KPIs' });
  }
});

export default router;
