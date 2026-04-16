const cors = require('cors');

// Allowed origins based on environment
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://calorify.com', // Production frontend
      'https://www.calorify.com',
      'https://api.calorify.com'
    ]
  : [
      'http://localhost:3000', // Local development
      'http://localhost:8080',
      'http://localhost:19006', // Expo default
      'http://192.168.1.*:*', // Local network
      /\.ngrok\.io$/ // Allow ngrok tunnels for testing
    ];

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => 
      typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
    )) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept'
  ],
  exposedHeaders: ['X-Total-Count', 'X-RateLimit-Remaining'],
  maxAge: 86400 // Cache preflight requests for 24 hours
};

// Simple CORS for development (allows everything)
const simpleCors = cors({
  origin: '*',
  credentials: false
});

module.exports = {
  corsOptions,
  simpleCors
};