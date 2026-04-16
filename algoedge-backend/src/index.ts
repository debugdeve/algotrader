import fastify from 'fastify';
import cron from 'node-cron';
import { AuthService } from './services/AuthService';
import { SocketPooler } from './socket/SocketPooler';
import { redis } from './config/redis';
import dotenv from 'dotenv';
import winston from 'winston';

dotenv.config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/system.log' }),
    new winston.transports.Console()
  ]
});

const server = fastify();
const pooler = new SocketPooler();

/**
 * Health Check API
 */
server.get('/health', async (request, reply) => {
  return { status: 'healthy', timestamp: new Date() };
});

/**
 * Manual Token Refresh Trigger
 */
server.post('/auth/refresh', async (request, reply) => {
  const result = await AuthService.refreshAllKeys();
  return result;
});

/**
 * Initialize System
 */
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '4000');
    
    // 1. Run initial token refresh
    logger.info('Starting initial token refresh...');
    await AuthService.refreshAllKeys();

    // 2. Start Socket Pool
    logger.info('Starting Socket Pooler...');
    await pooler.start();

    // 3. Schedule Daily Refresh (09:00 AM IST)
    // Timezone: Asia/Kolkata
    cron.schedule('0 9 * * *', async () => {
      logger.info('Running Scheduled Daily Token Refresh...');
      await AuthService.refreshAllKeys();
      logger.info('Restarting Socket Pool with new tokens...');
      await pooler.stopAll();
      await pooler.start();
    }, {
      timezone: 'Asia/Kolkata'
    });

    await server.listen({ port, host: '0.0.0.0' });
    logger.info(`AlgoTrader Pro Multiplexer listening on port ${port}`);
  } catch (err) {
    logger.error('Startup failed:', err);
    process.exit(1);
  }
};

start();
