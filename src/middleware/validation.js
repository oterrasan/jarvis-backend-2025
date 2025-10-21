import { validationResult } from 'express-validator';

// Middleware para validar requisições
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation error',
      details: errors.array()
    });
  }
  
  next();
};

// Middleware de tratamento de erros global
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Erro de validação do Postgres
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Duplicate entry',
      message: 'A record with this value already exists'
    });
  }
  
  // Erro de FK (foreign key)
  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Invalid reference',
      message: 'Referenced record does not exist'
    });
  }
  
  // Erro genérico
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Middleware para log de requisições
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

export default {
  validate,
  errorHandler,
  requestLogger
};
