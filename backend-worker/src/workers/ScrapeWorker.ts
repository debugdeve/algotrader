import { Worker, Job } from 'bullmq';
import { redisConfig } from '../config/redis';
import { ZeptoScraper } from '../scrapers/ZeptoScraper';
import winston from 'winston';

interface ScrapeJobData {
  query: string;
  lat: number;
  lng: number;
  platform: 'zepto' | 'blinkit' | 'instamart';
}

/**
 * High-performance BullMQ Worker for processing scrape jobs.
 * Orchestrates platform-specific scrapers and handles distributed job lifecycle.
 */
export const startScrapeWorker = () => {
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    defaultMeta: { service: 'scrape-worker' },
    transports: [new winston.transports.Console()],
  });

  const worker = new Worker<ScrapeJobData>(
    'scrape-jobs',
    async (job: Job<ScrapeJobData>) => {
      const { query, lat, lng, platform } = job.data;
      logger.info(`Processing Job ID: ${job.id} for "${query}" on ${platform}`);

      let scraper;

      // Factory pattern to instantiate the correct scraper
      switch (platform.toLowerCase()) {
        case 'zepto':
          scraper = new ZeptoScraper();
          break;
        // In the future, cases for 'blinkit', 'instamart' go here
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      // Execute search and return standardized results
      const results = await scraper.searchProduct(query, lat, lng);
      logger.info(`Successfully scraped ${results.length} products on ${platform}`);
      
      return results;
    },
    {
      connection: redisConfig,
      concurrency: 5, // Concurrent scraping jobs
      limiter: {
        max: 100, // Rate limit: Job executions per unit time
        duration: 1000,
      },
      // Job-level retry logic is managed by BullMQ queue options
    }
  );

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed: ${err.message}`);
  });

  logger.info('Scrape Worker started and listening for jobs in "scrape-jobs" queue');
  return worker;
};
