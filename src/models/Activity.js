import { query } from '../config/database.js';

class Activity {
  // Criar log de atividade
  static async create(tenantId, userId, data) {
    const { entity_type, entity_id, action, details = {}, ip_address = null, user_agent = null } = data;
    
    const result = await query(
      `INSERT INTO activities (tenant_id, user_id, entity_type, entity_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [tenantId, userId, entity_type, entity_id, action, JSON.stringify(details), ip_address, user_agent]
    );
    
    return result.rows[0];
  }
  
  // Buscar atividades por entidade
  static async findByEntity(tenantId, entityType, entityId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    const result = await query(
      `SELECT a.*, u.name as user_name, u.email as user_email
       FROM activities a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.tenant_id = $1 AND a.entity_type = $2 AND a.entity_id = $3
       ORDER BY a.created_at DESC
       LIMIT $4 OFFSET $5`,
      [tenantId, entityType, entityId, limit, offset]
    );
    
    return result.rows;
  }
  
  // Buscar atividades recentes do tenant
  static async getRecent(tenantId, options = {}) {
    const { limit = 20, user_id = null } = options;
    
    let queryStr = `
      SELECT a.*, u.name as user_name
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.tenant_id = $1
    `;
    const params = [tenantId];
    
    if (user_id) {
      queryStr += ' AND a.user_id = $2';
      params.push(user_id);
    }
    
    queryStr += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await query(queryStr, params);
    return result.rows;
  }
  
  // Helper: Log de criação
  static async logCreate(tenantId, userId, entityType, entityId, details = {}) {
    return this.create(tenantId, userId, {
      entity_type: entityType,
      entity_id: entityId,
      action: 'created',
      details
    });
  }
  
  // Helper: Log de atualização
  static async logUpdate(tenantId, userId, entityType, entityId, details = {}) {
    return this.create(tenantId, userId, {
      entity_type: entityType,
      entity_id: entityId,
      action: 'updated',
      details
    });
  }
  
  // Helper: Log de exclusão
  static async logDelete(tenantId, userId, entityType, entityId, details = {}) {
    return this.create(tenantId, userId, {
      entity_type: entityType,
      entity_id: entityId,
      action: 'deleted',
      details
    });
  }
}

export default Activity;
