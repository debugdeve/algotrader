import { Worker } from 'bullmq';
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
export declare const startScrapeWorker: () => Worker<ScrapeJobData, any, string>;
export {};
//# sourceMappingURL=ScrapeWorker.d.ts.map