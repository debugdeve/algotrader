import IORedis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Shared Redis connection configuration for BullMQ and status tracking.
 */
export const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Critical requirement for BullMQ
};

export const redisConnection = new IORedis(redisConfig);
