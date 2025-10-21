import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';

class User {
  // Hash de senha
  static async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }
  
  // Comparar senha
  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
  
  // Criar novo usuário
  static async create(data) {
    const { tenant_id, email, password, name, phone, role = 'user' } = data;
    
    const password_hash = await this.hashPassword(password);
    
    const result = await query(
      `INSERT INTO users (tenant_id, email, password_hash, name, phone, role, active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, tenant_id, email, name, phone, role, avatar_url, active, created_at`,
      [tenant_id, email.toLowerCase(), password_hash, name, phone, role]
    );
    
    return result.rows[0];
  }
  
  // Buscar usuário por ID
  static async findById(id) {
    const result = await query(
      `SELECT id, tenant_id, email, name, phone, role, avatar_url, active, email_verified, last_login_at, created_at
       FROM users 
       WHERE id = $1 AND active = true`,
      [id]
    );
    
    return result.rows[0];
  }
  
  // Buscar usuário por email (para login)
  static async findByEmail(email, tenantId = null) {
    let queryStr = `SELECT * FROM users WHERE email = $1 AND active = true`;
    const params = [email.toLowerCase()];
    
    if (tenantId) {
      queryStr += ` AND tenant_id = $2`;
      params.push(tenantId);
    }
    
    const result = await query(queryStr, params);
    return result.rows[0];
  }
  
  // Autenticar usuário
  static async authenticate(email, password, tenantId = null) {
    const user = await this.findByEmail(email, tenantId);
    
    if (!user) {
      return null;
    }
    
    const isValid = await this.comparePassword(password, user.password_hash);
    
    if (!isValid) {
      return null;
    }
    
    // Atualiza último login
    await query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    // Remove password_hash do retorno
    delete user.password_hash;
    
    return user;
  }
  
  // Listar usuários do tenant
  static async findByTenant(tenantId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    const result = await query(
      `SELECT id, tenant_id, email, name, phone, role, avatar_url, active, last_login_at, created_at
       FROM users 
       WHERE tenant_id = $1 AND active = true
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );
    
    return result.rows;
  }
  
  // Atualizar usuário
  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    // Se atualizar senha, fazer hash
    if (data.password) {
      data.password_hash = await this.hashPassword(data.password);
      delete data.password;
    }
    
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && key !== 'id' && key !== 'tenant_id') {
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
      `UPDATE users 
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount} AND active = true
       RETURNING id, tenant_id, email, name, phone, role, avatar_url, active, created_at`,
      values
    );
    
    return result.rows[0];
  }
  
  // Desativar usuário (soft delete)
  static async deactivate(id) {
    const result = await query(
      `UPDATE users 
       SET active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, email, name`,
      [id]
    );
    
    return result.rows[0];
  }
}

export default User;
