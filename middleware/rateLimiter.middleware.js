import rateLimit from 'express-rate-limit';

// Standard rate limiter for general routes (100 requests per 15 mins)
export const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

// Strict rate limiter for expensive AI & upload operations (10 requests per 15 mins)
export const expensiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Rate limit exceeded for expensive operations. Please try again after 15 minutes.'
  }
});
