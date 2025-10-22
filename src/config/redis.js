const redis = require('redis');

let redisClient;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.on('error', (err) => console.log('Redis Client Error', err));

    await redisClient.connect();
    console.log('Redis Connected');

    return redisClient;
  } catch (error) {
    console.error(`Redis Error: ${error.message}`);
    console.log('Continuing without Redis...');
  }
};

module.exports = connectRedis;