import { verifyToken, extractToken } from '../config/auth.js';
import { query } from '../config/database.js';

// Middleware para verificar autenticação
export const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
    }
    
    // Verifica e decodifica o token
    const decoded = verifyToken(token);
    
    // Busca usuário no banco
    const result = await query(
      'SELECT id, tenant_id, email, name, role FROM users WHERE id = $1 AND active = true',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'User not found or inactive'
      });
    }
    
    // Adiciona usuário ao request
    req.user = result.rows[0];
    req.tenantId = result.rows[0].tenant_id;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
};

// Middleware para verificar role (permissões)
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Insufficient permissions'
      });
    }
    
    next();
  };
};

// Middleware para garantir isolamento multi-tenant
export const tenantIsolation = (req, res, next) => {
  if (!req.tenantId) {
    return res.status(403).json({
      error: 'Tenant isolation error',
      message: 'No tenant context'
    });
  }
  
  // Adiciona tenant_id em todas as queries automaticamente
  req.getTenantFilter = () => {
    return { tenant_id: req.tenantId };
  };
  
  next();
};

export default {
  authenticate,
  authorize,
  tenantIsolation
};
