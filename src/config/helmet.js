const helmet = require('helmet');

// Custom helmet configuration
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.fatsecret.com", "https://oauth.fatsecret.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Allow cross-origin resources
  crossOriginResourcePolicy: {
    policy: "cross-origin"
  },
  dnsPrefetchControl: {
    allow: false
  },
  frameguard: {
    action: 'deny'
  },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  xssFilter: true
});

// Simpler version for development
const devHelmet = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
});

module.exports = {
  helmetConfig,
  devHelmet
};