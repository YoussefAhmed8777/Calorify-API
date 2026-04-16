/**
 * Escape HTML special characters to prevent XSS attacks
 * Converts: & < > " ' / ` to HTML entities
 */
const escapeHtml = (str) => {
  if (!str || typeof str !== 'string') return str;
  
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  return str.replace(/[&<>"'/`=]/g, (char) => htmlEscapes[char]);
};

/**
 * Recursively sanitize an object or array
 * Cleans ALL user input to prevent XSS
 */
const sanitizeObject = (obj) => {
  if (!obj) return obj;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  // Handle objects
  if (typeof obj === 'object' && obj !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Recursively sanitize nested objects
      if (value && typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } 
      // Sanitize strings
      else if (typeof value === 'string') {
        sanitized[key] = escapeHtml(value);
      }
      // Keep other types (numbers, booleans) as-is
      else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * Express middleware for XSS protection
 * Automatically sanitizes req.body, req.query, and req.params
 */
const xssProtection = () => {
  return (req, res, next) => {
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    
    // Sanitize headers (optional - usually not needed)
    // if (req.headers) {
    //   req.headers = sanitizeObject(req.headers);
    // }
    
    next();
  };
};

// Export both the middleware and individual functions
module.exports = {
  xssProtection,
  escapeHtml,
  sanitizeObject
};