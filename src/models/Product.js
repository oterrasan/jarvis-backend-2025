import { query } from '../config/database.js';

class Product {
  // Criar novo produto
  static async create(tenantId, data) {
    const { name, category, description, commission_rate, active = true } = data;
    
    const result = await query(
      `INSERT INTO products (tenant_id, name, category, description, commission_rate, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [tenantId, name, category, description, commission_rate, active]
    );
    
    return result.rows[0];
  }
  
  // Buscar produto por ID
  static async findById(id, tenantId) {
    const result = await query(
      `SELECT * FROM products 
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    
    return result.rows[0];
  }
  
  // Listar produtos
  static async list(tenantId, options = {}) {
    const { active = null, category = null } = options;
    
    let queryStr = 'SELECT * FROM products WHERE tenant_id = $1';
    const params = [tenantId];
    let paramCount = 2;
    
    if (active !== null) {
      queryStr += ` AND active = $${paramCount}`;
      params.push(active);
      paramCount++;
    }
    
    if (category) {
      queryStr += ` AND category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }
    
    queryStr += ' ORDER BY name ASC';
    
    const result = await query(queryStr, params);
    return result.rows;
  }
  
  // Atualizar produto
  static async update(id, tenantId, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    const allowedFields = ['name', 'category', 'description', 'commission_rate', 'active'];
    
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
      `UPDATE products 
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
       RETURNING *`,
      values
    );
    
    return result.rows[0];
  }
  
  // Deletar produto
  static async delete(id, tenantId) {
    const result = await query(
      `DELETE FROM products 
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, name`,
      [id, tenantId]
    );
    
    return result.rows[0];
  }
}

export default Product;
