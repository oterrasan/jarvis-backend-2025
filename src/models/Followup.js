import { query } from '../config/database.js';

class Followup {
  // Criar follow-up
  static async create(tenantId, data, userId) {
    const {
      client_id,
      proposal_id = null,
      type,
      title,
      description,
      due_date,
      status = 'pending',
      assigned_to = userId
    } = data;
    
    const result = await query(
      `INSERT INTO followups (
        tenant_id, client_id, proposal_id, type, title, 
        description, due_date, status, assigned_to, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [tenantId, client_id, proposal_id, type, title, description, due_date, status, assigned_to, userId]
    );
    
    return result.rows[0];
  }
  
  // Buscar follow-up por ID
  static async findById(id, tenantId) {
    const result = await query(
      `SELECT f.*, 
        c.name as client_name, c.phone as client_phone,
        u.name as assigned_to_name
       FROM followups f
       LEFT JOIN clients c ON f.client_id = c.id
       LEFT JOIN users u ON f.assigned_to = u.id
       WHERE f.id = $1 AND f.tenant_id = $2 AND f.deleted_at IS NULL`,
      [id, tenantId]
    );
    
    return result.rows[0];
  }
  
  // Listar follow-ups
  static async list(tenantId, options = {}) {
    const {
      client_id = null,
      proposal_id = null,
      type = null,
      status = null,
      assigned_to = null,
      date_from = null,
      date_to = null,
      limit = 50,
      offset = 0
    } = options;
    
    let queryStr = `
      SELECT f.*, 
        c.name as client_name,
        u.name as assigned_to_name
      FROM followups f
      LEFT JOIN clients c ON f.client_id = c.id
      LEFT JOIN users u ON f.assigned_to = u.id
      WHERE f.tenant_id = $1 AND f.deleted_at IS NULL
    `;
    const params = [tenantId];
    let paramCount = 2;
    
    if (client_id) {
      queryStr += ` AND f.client_id = $${paramCount}`;
      params.push(client_id);
      paramCount++;
    }
    
    if (proposal_id) {
      queryStr += ` AND f.proposal_id = $${paramCount}`;
      params.push(proposal_id);
      paramCount++;
    }
    
    if (type) {
      queryStr += ` AND f.type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }
    
    if (status) {
      queryStr += ` AND f.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (assigned_to) {
      queryStr += ` AND f.assigned_to = $${paramCount}`;
      params.push(assigned_to);
      paramCount++;
    }
    
    if (date_from) {
      queryStr += ` AND f.due_date >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }
    
    if (date_to) {
      queryStr += ` AND f.due_date <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }
    
    queryStr += ` ORDER BY f.due_date ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);
    
    const result = await query(queryStr, params);
    
    return {
      data: result.rows,
      total: result.rows.length
    };
  }
  
  // Agenda do dia
  static async getTodayAgenda(tenantId, userId = null) {
    let queryStr = `
      SELECT f.*, 
        c.name as client_name, c.phone as client_phone,
        u.name as assigned_to_name
      FROM followups f
      LEFT JOIN clients c ON f.client_id = c.id
      LEFT JOIN users u ON f.assigned_to = u.id
      WHERE f.tenant_id = $1 
        AND f.deleted_at IS NULL
        AND f.status = 'pending'
        AND DATE(f.due_date) = CURRENT_DATE
    `;
    const params = [tenantId];
    
    if (userId) {
      queryStr += ' AND f.assigned_to = $2';
      params.push(userId);
    }
    
    queryStr += ' ORDER BY f.due_date ASC';
    
    const result = await query(queryStr, params);
    return result.rows;
  }
  
  // Tarefas atrasadas
  static async getOverdue(tenantId, userId = null) {
    let queryStr = `
      SELECT f.*, 
        c.name as client_name, c.phone as client_phone
      FROM followups f
      LEFT JOIN clients c ON f.client_id = c.id
      WHERE f.tenant_id = $1 
        AND f.deleted_at IS NULL
        AND f.status = 'pending'
        AND f.due_date < CURRENT_TIMESTAMP
    `;
    const params = [tenantId];
    
    if (userId) {
      queryStr += ' AND f.assigned_to = $2';
      params.push(userId);
    }
    
    queryStr += ' ORDER BY f.due_date ASC';
    
    const result = await query(queryStr, params);
    return result.rows;
  }
  
  // Atualizar follow-up
  static async update(id, tenantId, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    const allowedFields = [
      'client_id', 'proposal_id', 'type', 'title', 
      'description', 'due_date', 'status', 'result', 'assigned_to'
    ];
    
    Object.keys(data).forEach(key => {
      if (allowedFields.includes(key) && data[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(data[key]);
        paramCount++;
      }
    });
    
    // Se marcar como concluído, adicionar timestamp
    if (data.status === 'completed') {
      fields.push(`completed_at = CURRENT_TIMESTAMP`);
    }
    
    if (fields.length === 0) {
      return null;
    }
    
    values.push(id, tenantId);
    
    const result = await query(
      `UPDATE followups 
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1} AND deleted_at IS NULL
       RETURNING *`,
      values
    );
    
    return result.rows[0];
  }
  
  // Marcar como concluído
  static async complete(id, tenantId, result = null) {
    const queryStr = `
      UPDATE followups 
      SET status = 'completed', 
          completed_at = CURRENT_TIMESTAMP,
          result = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
      RETURNING *
    `;
    
    const queryResult = await query(queryStr, [result, id, tenantId]);
    return queryResult.rows[0];
  }
  
  // Deletar follow-up (soft delete)
  static async delete(id, tenantId) {
    const result = await query(
      `UPDATE followups 
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id, title`,
      [id, tenantId]
    );
    
    return result.rows[0];
  }
  
  // Estatísticas
  static async getStats(tenantId, userId = null) {
    let queryStr = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'pending' AND due_date < CURRENT_TIMESTAMP) as overdue,
        COUNT(*) FILTER (WHERE status = 'pending' AND DATE(due_date) = CURRENT_DATE) as today
      FROM followups 
      WHERE tenant_id = $1 AND deleted_at IS NULL
    `;
    const params = [tenantId];
    
    if (userId) {
      queryStr += ' AND assigned_to = $2';
      params.push(userId);
    }
    
    const result = await query(queryStr, params);
    return result.rows[0];
  }
}

export default Followup;
