import { query } from '../config/database.js';

class Tenant {
  // Criar novo tenant
  static async create(data) {
    const { name, subdomain, cnpj, logo_url, plan = 'free' } = data;
    
    const result = await query(
      `INSERT INTO tenants (name, subdomain, cnpj, logo_url, plan, active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [name, subdomain, cnpj, logo_url, plan]
    );
    
    return result.rows[0];
  }
  
  // Buscar tenant por ID
  static async findById(id) {
    const result = await query(
      'SELECT * FROM tenants WHERE id = $1 AND active = true',
      [id]
    );
    
    return result.rows[0];
  }
  
  // Buscar tenant por subdomínio
  static async findBySubdomain(subdomain) {
    const result = await query(
      'SELECT * FROM tenants WHERE subdomain = $1 AND active = true',
      [subdomain]
    );
    
    return result.rows[0];
  }
  
  // Atualizar tenant
  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(data[key]);
        paramCount++;
      }
    });
    
    if (fields.length === 0) {
      return null;
    }
    
    values.push(id);
    
    const result = await query(
      `UPDATE tenants 
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount} AND active = true
       RETURNING *`,
      values
    );
    
    return result.rows[0];
  }
  
  // Criar produtos padrão para o tenant
  static async createDefaultProducts(tenantId) {
    const defaultProducts = [
      { name: 'Seguro Auto', category: 'auto', description: 'Proteção completa para seu veículo', commission_rate: 15.00 },
      { name: 'Seguro Residencial', category: 'residencial', description: 'Proteção para seu lar e patrimônio', commission_rate: 12.00 },
      { name: 'Seguro Empresarial', category: 'empresarial', description: 'Proteção completa para sua empresa', commission_rate: 18.00 },
      { name: 'Seguro Vida', category: 'vida', description: 'Proteção financeira para sua família', commission_rate: 20.00 },
      { name: 'Plano de Saúde', category: 'saude', description: 'Assistência médica completa', commission_rate: 25.00 },
      { name: 'Consórcio', category: 'consorcio', description: 'Realize seus sonhos com parcelas planejadas', commission_rate: 10.00 },
      { name: 'Previdência Privada', category: 'previdencia', description: 'Planeje seu futuro com segurança', commission_rate: 15.00 },
      { name: 'Seguro Viagem', category: 'viagem', description: 'Viaje com tranquilidade e segurança', commission_rate: 8.00 }
    ];
    
    const insertPromises = defaultProducts.map(product => 
      query(
        `INSERT INTO products (tenant_id, name, category, description, commission_rate, active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [tenantId, product.name, product.category, product.description, product.commission_rate]
      )
    );
    
    await Promise.all(insertPromises);
    
    return defaultProducts.length;
  }
  
  // Desativar tenant (soft delete)
  static async deactivate(id) {
    const result = await query(
      `UPDATE tenants 
       SET active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    return result.rows[0];
  }
}

export default Tenant;
