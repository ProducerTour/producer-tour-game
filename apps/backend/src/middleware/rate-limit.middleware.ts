import rateLimit from 'express-rate-limit';

// Strict rate limiter for authentication endpoints
// Prevents brute force attacks on login/register endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests
  // Trust proxy configuration - works with Express trust proxy setting
  // Validates that app.set('trust proxy', 1) is configured
  validate: { trustProxy: false }, // Disable validation since we handle it in Express config
  handler: (req, res) => {
    console.log(`Rate limit exceeded for auth endpoint from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many authentication attempts from this IP, please try again after 15 minutes'
    });
  }
});

// General API rate limiter
// Prevents API abuse for general endpoints
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute in dev, 15 in prod
  max: process.env.NODE_ENV === 'development' ? 10000 : 100, // Effectively disabled in dev
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Trust proxy configuration - works with Express trust proxy setting
  validate: { trustProxy: false }, // Disable validation since we handle it in Express config
  handler: (req, res) => {
    console.log(`Rate limit exceeded for API endpoint from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests from this IP, please try again after 15 minutes'
    });
  }
});
