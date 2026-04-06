"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScrapeWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const ZeptoScraper_1 = require("../scrapers/ZeptoScraper");
const winston_1 = __importDefault(require("winston"));
/**
 * High-performance BullMQ Worker for processing scrape jobs.
 * Orchestrates platform-specific scrapers and handles distributed job lifecycle.
 */
const startScrapeWorker = () => {
    const logger = winston_1.default.createLogger({
        level: 'info',
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
        defaultMeta: { service: 'scrape-worker' },
        transports: [new winston_1.default.transports.Console()],
    });
    const worker = new bullmq_1.Worker('scrape-jobs', async (job) => {
        const { query, lat, lng, platform } = job.data;
        logger.info(`Processing Job ID: ${job.id} for "${query}" on ${platform}`);
        let scraper;
        // Factory pattern to instantiate the correct scraper
        switch (platform.toLowerCase()) {
            case 'zepto':
                scraper = new ZeptoScraper_1.ZeptoScraper();
                break;
            // In the future, cases for 'blinkit', 'instamart' go here
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
        // Execute search and return standardized results
        const results = await scraper.searchProduct(query, lat, lng);
        logger.info(`Successfully scraped ${results.length} products on ${platform}`);
        return results;
    }, {
        connection: redis_1.redisConfig,
        concurrency: 5, // Concurrent scraping jobs
        limiter: {
            max: 100, // Rate limit: Job executions per unit time
            duration: 1000,
        },
        // Job-level retry logic is managed by BullMQ queue options
    });
    worker.on('completed', (job) => {
        logger.info(`Job ${job.id} completed successfully`);
    });
    worker.on('failed', (job, err) => {
        logger.error(`Job ${job?.id} failed: ${err.message}`);
    });
    logger.info('Scrape Worker started and listening for jobs in "scrape-jobs" queue');
    return worker;
};
exports.startScrapeWorker = startScrapeWorker;
//# sourceMappingURL=ScrapeWorker.js.map