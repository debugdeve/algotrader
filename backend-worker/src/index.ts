import { startScrapeWorker } from './workers/ScrapeWorker';
import winston from 'winston';

/**
 * Main application entry to start the distributed scraping worker service.
 */
const main = () => {
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    defaultMeta: { service: 'scraper-app' },
    transports: [new winston.transports.Console()],
  });

  logger.info('Initializing Node.js Distributed Scraper Worker Service');

  // Start the BullMQ Worker
  const worker = startScrapeWorker();

  // Graceful Shutdown - Crucial for distributed systems
  const handleShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down worker gracefully...`);
    await worker.close();
    process.exit(0);
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  
  logger.info('Scraper Worker Service is up and running');
};

main();
