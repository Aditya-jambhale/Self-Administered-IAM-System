const rateLimitWindow = 15 * 60 * 1000; // 15 minutes
const rateLimitMax = 100; // max 100 requests per IP per window
const ipRequests = new Map();

// Periodic cleanup of expired rate limit records
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipRequests.entries()) {
    if (now - data.windowStart > rateLimitWindow) {
      ipRequests.delete(ip);
    }
  }
}, rateLimitWindow);

const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();

  if (!ipRequests.has(ip)) {
    ipRequests.set(ip, { count: 1, windowStart: now });
    return next();
  }

  const data = ipRequests.get(ip);
  if (now - data.windowStart > rateLimitWindow) {
    data.count = 1;
    data.windowStart = now;
    return next();
  }

  data.count += 1;
  if (data.count > rateLimitMax) {
    return res.status(429).json({
      success: false,
      message: "Too many requests from this IP, please try again after 15 minutes."
    });
  }

  next();
};

export default rateLimiter;
