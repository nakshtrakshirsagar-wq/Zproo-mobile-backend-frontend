import rateLimit from 'express-rate-limit';

const make = (windowMs: number, limit: number, message: string) =>
  rateLimit({
    windowMs, limit, standardHeaders: true, legacyHeaders: false,
    handler: (req, res) => {
      const reset = req.rateLimit?.resetTime?.getTime() ?? Date.now() + windowMs;
      const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      res.status(429).json({ error: { code: 'TOO_MANY_ATTEMPTS', message, details: { retryAfterSec } } });
    },
  });

export const limits = {
  general: make(60 * 1000, 300, 'Too many requests. Please slow down.'),
  otp: make(15 * 60 * 1000, 30, 'Too many attempts. Please try again later.'),
};
