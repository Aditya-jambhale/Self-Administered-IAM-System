import { RateLimiterRedis, RateLimiterMemory } from "rate-limiter-flexible";
import redisClient from "../config/redis.js";

const rateLimitWindowSeconds = 15 * 60; // 15 minutes in seconds
const rateLimitMax = 100; // max 100 requests per IP per window

const rateLimiterRedis = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "iam_rate_limit",
  points: rateLimitMax,
  duration: rateLimitWindowSeconds,
  useRedisPackage: true,  // tells the server to use modern v4+ redis package 
});

const rateLimiterMemory = new RateLimiterMemory({
  points: rateLimitMax,
  duration: rateLimitWindowSeconds,
});

const handleRateLimitExceeded = (rejRes, res) => {
  const secs = Math.ceil(rejRes.msBeforeNext / 1000) || 1;
  res.set("Retry-After", String(secs));
  return res.status(429).json({
    success: false,
    message: `Too many requests from this IP, please try again after ${secs} seconds.`
  });
};

const consumeMemory = (ip, res, next) => {
  rateLimiterMemory.consume(ip)
    .then(() => {
      next();
    })
    .catch((err) => {
      if (err && err.msBeforeNext !== undefined) {
        return handleRateLimitExceeded(err, res);
      }
      console.error("[RateLimiter] Memory limiter error:", err);
      next();
    });
};

const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  if (redisClient.isReady) {
    rateLimiterRedis.consume(ip)
      .then(() => {
        next();
      })
      .catch((err) => {
        // If it's a rate limit rejection (has msBeforeNext)
        if (err && err.msBeforeNext !== undefined) {
          return handleRateLimitExceeded(err, res);
        }
        // If it is  a connection/internal error, fall back to memory
        console.warn(`[RateLimiter] Redis error: ${err.message || err}. Falling back to memory store.`);
        consumeMemory(ip, res, next);
      });
  } else {
    // Redis not ready, fall back to memory
    consumeMemory(ip, res, next);
  }
};

export default rateLimiter;
