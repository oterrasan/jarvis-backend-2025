import { query } from '../config/database.js';

class Client {
  // Criar novo cliente
  static async create(tenantId, data, userId) {
    const {
      type, name, document, rg, birth_date,
      email, phone, whatsapp,
      address, number, complement, neighborhood, city, state, zipcode,
      occupation, income, company_name, state_registration,
      status = 'lead', source, tags = [], rating = 0, notes
    } = data;
    
    const result = await query(
      `INSERT INTO clients (
        tenant_id, type, name, document, rg, birth_date,
        email, phone, whatsapp,
        address, number, complement, neighborhood, city, state, zipcode,
        occupation, income, company_name, state_registration,
        status, source, tags, rating, notes, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26
      ) RETURNING *`,
      [
        tenantId, type, name, document, rg, birth_date,
        email, phone, whatsapp,
        address, number, complement, neighborhood, city, state, zipcode,
        occupation, income, company_name, state_registration,
        status, source, tags, rating, notes, userId
      ]
    );
    
    return result.rows[0];
  }
  
  // Buscar cliente por ID
  static async findById(id, tenantId) {
    const result = await query(
      `SELECT * FROM clients 
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    );
    
    return result.rows[0];
  }
  
  // Listar clientes com filtros e paginação
  static async list(tenantId, options = {}) {
    const {
      search = '',
      type = null,
      status = null,
      tags = [],
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      order = 'DESC'
    } = options;
    
    let queryStr = `
      SELECT * FROM clients 
      WHERE tenant_id = $1 AND deleted_at IS NULL
    `;
    const params = [tenantId];
    let paramCount = 2;
    
    // Busca por nome, documento ou email
    if (search) {
      queryStr += ` AND (
        name ILIKE $${paramCount} OR 
        document ILIKE $${paramCount} OR 
        email ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }
    
    // Filtro por tipo (PF/PJ)
    if (type) {
      queryStr += ` AND type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }
    
    // Filtro por status
    if (status) {
      queryStr += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    // Filtro por tags
    if (tags.length > 0) {
      queryStr += ` AND tags && $${paramCount}`;
      params.push(tags);
      paramCount++;
    }
    
    // Ordenação
    const allowedOrderBy = ['name', 'created_at', 'updated_at', 'rating'];
    const validOrderBy = allowedOrderBy.includes(orderBy) ? orderBy : 'created_at';
    const validOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    queryStr += ` ORDER BY ${validOrderBy} ${validOrder}`;
    
    // Paginação
    queryStr += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);
    
    const result = await query(queryStr, params);
    
    // Conta total (para paginação)
    const countResult = await query(
      'SELECT COUNT(*) FROM clients WHERE tenant_id = $1 AND deleted_at IS NULL',
      [tenantId]
    );
    
    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }
  
  // Buscar por documento (CPF/CNPJ)
  static async findByDocument(document, tenantId) {
    const result = await query(
      `SELECT * FROM clients 
       WHERE document = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [document, tenantId]
    );
    
    return result.rows[0];
  }
  
  // Atualizar cliente
  static async update(id, tenantId, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    const allowedFields = [
      'type', 'name', 'document', 'rg', 'birth_date',
      'email', 'phone', 'whatsapp',
      'address', 'number', 'complement', 'neighborhood', 'city', 'state', 'zipcode',
      'occupation', 'income', 'company_name', 'state_registration',
      'status', 'source', 'tags', 'rating', 'notes'
    ];
    
    Object.keys(data).forEach(key => {
      if (allowedFields.includes(key) && data[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(data[key]);
        paramCount++;
      }
    });
    
    if (fields.length === 0) {
      return null;
    }
    
    values.push(id, tenantId);
    
    const result = await query(
      `UPDATE clients 
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1} AND deleted_at IS NULL
       RETURNING *`,
      values
    );
    
    return result.rows[0];
  }
  
  // Deletar cliente (soft delete)
  static async delete(id, tenantId) {
    const result = await query(
      `UPDATE clients 
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id, name, document`,
      [id, tenantId]
    );
    
    return result.rows[0];
  }
  
  // Importação em massa
  static async bulkCreate(tenantId, clients, userId) {
    const results = [];
    const errors = [];
    
    for (let i = 0; i < clients.length; i++) {
      try {
        const client = await this.create(tenantId, clients[i], userId);
        results.push(client);
      } catch (error) {
        errors.push({
          index: i,
          data: clients[i],
          error: error.message
        });
      }
    }
    
    return {
      success: results.length,
      failed: errors.length,
      results,
      errors
    };
  }
  
  // Estatísticas
  static async getStats(tenantId) {
    const result = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE type = 'PF') as total_pf,
        COUNT(*) FILTER (WHERE type = 'PJ') as total_pj,
        COUNT(*) FILTER (WHERE status = 'lead') as leads,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_this_month
       FROM clients 
       WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId]
    );
    
    return result.rows[0];
  }
}

export default Client;
