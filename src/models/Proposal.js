import { query } from '../config/database.js';

class Proposal {
  // Criar nova proposta
  static async create(tenantId, data, userId) {
    const {
      client_id,
      product_id,
      value,
      commission,
      installments = 1,
      status = 'draft',
      valid_until,
      notes
    } = data;
    
    const result = await query(
      `INSERT INTO proposals (
        tenant_id, client_id, product_id, value, commission, 
        installments, status, valid_until, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [tenantId, client_id, product_id, value, commission, installments, status, valid_until, notes, userId]
    );
    
    return result.rows[0];
  }
  
  // Buscar proposta por ID
  static async findById(id, tenantId) {
    const result = await query(
      `SELECT p.*, 
        c.name as client_name, c.email as client_email, c.phone as client_phone,
        prod.name as product_name, prod.category as product_category
       FROM proposals p
       JOIN clients c ON p.client_id = c.id
       JOIN products prod ON p.product_id = prod.id
       WHERE p.id = $1 AND p.tenant_id = $2 AND p.deleted_at IS NULL`,
      [id, tenantId]
    );
    
    return result.rows[0];
  }
  
  // Listar propostas com filtros
  static async list(tenantId, options = {}) {
    const {
      client_id = null,
      status = null,
      product_id = null,
      date_from = null,
      date_to = null,
      limit = 50,
      offset = 0
    } = options;
    
    let queryStr = `
      SELECT p.*, 
        c.name as client_name, c.document as client_document,
        prod.name as product_name, prod.category as product_category
      FROM proposals p
      JOIN clients c ON p.client_id = c.id
      JOIN products prod ON p.product_id = prod.id
      WHERE p.tenant_id = $1 AND p.deleted_at IS NULL
    `;
    const params = [tenantId];
    let paramCount = 2;
    
    if (client_id) {
      queryStr += ` AND p.client_id = $${paramCount}`;
      params.push(client_id);
      paramCount++;
    }
    
    if (status) {
      queryStr += ` AND p.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (product_id) {
      queryStr += ` AND p.product_id = $${paramCount}`;
      params.push(product_id);
      paramCount++;
    }
    
    if (date_from) {
      queryStr += ` AND p.created_at >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }
    
    if (date_to) {
      queryStr += ` AND p.created_at <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }
    
    queryStr += ` ORDER BY p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);
    
    const result = await query(queryStr, params);
    
    // Conta total
    const countResult = await query(
      'SELECT COUNT(*) FROM proposals WHERE tenant_id = $1 AND deleted_at IS NULL',
      [tenantId]
    );
    
    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }
  
  // Funil Kanban - agrupar por status
  static async getFunnelData(tenantId, options = {}) {
    const { date_from = null, date_to = null } = options;
    
    let queryStr = `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(value) as total_value,
        AVG(value) as avg_value
      FROM proposals
      WHERE tenant_id = $1 AND deleted_at IS NULL
    `;
    const params = [tenantId];
    let paramCount = 2;
    
    if (date_from) {
      queryStr += ` AND created_at >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }
    
    if (date_to) {
      queryStr += ` AND created_at <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }
    
    queryStr += ' GROUP BY status ORDER BY count DESC';
    
    const result = await query(queryStr, params);
    return result.rows;
  }
  
  // Atualizar proposta
  static async update(id, tenantId, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    const allowedFields = [
      'client_id', 'product_id', 'value', 'commission', 
      'installments', 'status', 'valid_until', 'notes',
      'rejection_reason'
    ];
    
    Object.keys(data).forEach(key => {
      if (allowedFields.includes(key) && data[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(data[key]);
        paramCount++;
      }
    });
    
    // Atualizar datas baseado no status
    if (data.status === 'approved' && !data.approved_at) {
      fields.push(`approved_at = CURRENT_TIMESTAMP`);
    }
    if (data.status === 'rejected' && !data.rejected_at) {
      fields.push(`rejected_at = CURRENT_TIMESTAMP`);
    }
    
    if (fields.length === 0) {
      return null;
    }
    
    values.push(id, tenantId);
    
    const result = await query(
      `UPDATE proposals 
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1} AND deleted_at IS NULL
       RETURNING *`,
      values
    );
    
    return result.rows[0];
  }
  
  // Deletar proposta (soft delete)
  static async delete(id, tenantId) {
    const result = await query(
      `UPDATE proposals 
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id, value, status`,
      [id, tenantId]
    );
    
    return result.rows[0];
  }
  
  // Estatísticas
  static async getStats(tenantId, period = '30days') {
    const periodMap = {
      '7days': '7 days',
      '30days': '30 days',
      '90days': '90 days',
      '1year': '1 year'
    };
    
    const interval = periodMap[period] || '30 days';
    
    const result = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'draft') as draft,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'analyzing') as analyzing,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        SUM(value) FILTER (WHERE status = 'approved') as total_approved_value,
        SUM(commission) FILTER (WHERE status = 'approved') as total_commission,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'approved')::numeric / 
          NULLIF(COUNT(*) FILTER (WHERE status IN ('sent', 'analyzing', 'approved', 'rejected')), 0) * 100, 
          2
        ) as conversion_rate
       FROM proposals 
       WHERE tenant_id = $1 
         AND deleted_at IS NULL
         AND created_at >= CURRENT_DATE - INTERVAL '${interval}'`,
      [tenantId]
    );
    
    return result.rows[0];
  }
}

export default Proposal;
