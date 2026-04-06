"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ScrapeWorker_1 = require("./workers/ScrapeWorker");
const winston_1 = __importDefault(require("winston"));
/**
 * Main application entry to start the distributed scraping worker service.
 */
const main = () => {
    const logger = winston_1.default.createLogger({
        level: 'info',
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
        defaultMeta: { service: 'scraper-app' },
        transports: [new winston_1.default.transports.Console()],
    });
    logger.info('Initializing Node.js Distributed Scraper Worker Service');
    // Start the BullMQ Worker
    const worker = (0, ScrapeWorker_1.startScrapeWorker)();
    // Graceful Shutdown - Crucial for distributed systems
    const handleShutdown = async (signal) => {
        logger.info(`Received ${signal}. Shutting down worker gracefully...`);
        await worker.close();
        process.exit(0);
    };
    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    logger.info('Scraper Worker Service is up and running');
};
main();
//# sourceMappingURL=index.js.map