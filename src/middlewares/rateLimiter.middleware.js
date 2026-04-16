const rateLimit = require('express-rate-limit');

// General rate limit for all API routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again after 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
});

// Stricter limit for authentication routes (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Only 10 login attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    success: false,
    error: 'Too many login attempts, please try again after 15 minutes'
  }
});

// Limit for AI scan endpoints (free tier: 3 scans/day)
const scanLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // 3 scans per day for free tier
  message: {
    success: false,
    error: 'Daily scan limit reached. Upgrade to premium for unlimited scans'
  }
});

// Premium scan limiter (unlimited for premium users)
const premiumScanLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 scans per minute (reasonable limit)
  message: {
    success: false,
    error: 'Too many scans. Please wait a moment before trying again'
  }
});

// Chat limiter (5 messages/day for free tier)
const chatLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5,
  message: {
    success: false,
    error: 'Daily chat limit reached. Upgrade to premium for unlimited messages'
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  scanLimiter,
  premiumScanLimiter,
  chatLimiter
};