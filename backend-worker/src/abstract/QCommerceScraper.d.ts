import { AxiosInstance } from 'axios';
import winston from 'winston';
/**
 * Standardized Product Interface for the entire aggregator ecosystem.
 */
export interface StandardizedProduct {
    platform: string;
    productName: string;
    price: number;
    currency: string;
    deliveryTime: string;
    imageUrl: string;
    productUrl: string;
    timestamp: string;
}
/**
 * Abstract Base Class for all Quick-Commerce Scrapers.
 * Handles header rotation, proxy injection, and resilience logic.
 */
export declare abstract class QCommerceScraper {
    protected axiosInstance: AxiosInstance;
    protected logger: winston.Logger;
    protected platformName: string;
    constructor(platformName: string);
    /**
     * Rotates User-Agents and mobile device fingerprints to avoid detection.
     */
    protected getRandomHeaders(): Record<string, string>;
    /**
     * Setup Axios interceptors for retries on rate limits (429) or forbidden (403).
     */
    private setupInterceptors;
    /**
     * Abstract method to be implemented by specific platform scrapers.
     */
    abstract searchProduct(query: string, lat: number, lng: number): Promise<StandardizedProduct[]>;
}
//# sourceMappingURL=QCommerceScraper.d.ts.map