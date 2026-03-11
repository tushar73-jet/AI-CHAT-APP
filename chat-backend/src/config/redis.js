const { createAdapter } = require("@socket.io/redis-adapter");
const Redis = require("ioredis");

async function setupRedisAdapter(io) {
  if (!process.env.REDIS_URL) {
    console.log("REDIS_URL not set, skipping Redis adapter");
    return;
  }
  try {
    const pubClient = new Redis(process.env.REDIS_URL, {
      retryStrategy: times => {
        // Stop retrying after 3 attempts if it fails
        if (times > 3) {
          console.log("Redis connection failed too many times, disabling adapter.");
          return null;
        }
        return Math.min(times * 50, 2000);
      }
    });
    const subClient = pubClient.duplicate();

    pubClient.on('error', err => console.error("Redis Pub Error:", err.message));
    subClient.on('error', err => console.error("Redis Sub Error:", err.message));

    io.adapter(createAdapter(pubClient, subClient));
    console.log("Redis adapter initialized");
  } catch (err) {
    console.error("Redis setup error:", err);
  }
}

module.exports = {
  setupRedisAdapter
};
