import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// Mask password in logs
const maskedUrl = redisUrl.replace(/redis:\/\/([^:]+):([^@]+)@/, "redis://$1:****@");
console.log(`[Redis] Initializing client for: ${maskedUrl}`);

const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      // Reconnect after 1s, 2s, up to 5s max
      const delay = Math.min(retries * 1000, 5000);
      console.log(`[Redis] Reconnect attempt #${retries} in ${delay}ms`);
      return delay;
    }
  }
});

redisClient.on("error", (err) => {
  console.error("[Redis] Client Error:", err);
});

redisClient.on("connect", () => {
  console.log("[Redis] Connected successfully");
});

redisClient.on("reconnecting", () => {
  console.log("[Redis] Reconnecting to server...");
});

// Initialize connection
redisClient.connect().catch((err) => {
  console.error("[Redis] Connection failed at startup:", err);
});

export default redisClient;
