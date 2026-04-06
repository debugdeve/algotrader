import { QCommerceScraper, StandardizedProduct } from '../abstract/QCommerceScraper';
/**
 * Concrete implementation for Zepto's mobile API scraping.
 * Simulates mobile app requests and normalizes responses.
 */
export declare class ZeptoScraper extends QCommerceScraper {
    private readonly API_BASE_URL;
    constructor();
    /**
     * Main search method for Zepto products.
     */
    searchProduct(query: string, lat: number, lng: number): Promise<StandardizedProduct[]>;
    /**
     * Standardizes the platform's response into a uniform format for the aggregator.
     */
    private normalizeResponse;
}
//# sourceMappingURL=ZeptoScraper.d.ts.map