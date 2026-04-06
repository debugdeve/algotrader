import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
// @ts-ignore
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as dotenv from 'dotenv';
import winston from 'winston';

dotenv.config();

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
export abstract class QCommerceScraper {
  protected axiosInstance: AxiosInstance;
  protected logger: winston.Logger;
  protected platformName: string;

  constructor(platformName: string) {
    this.platformName = platformName;
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: `${platformName}-scraper` },
      transports: [
        new winston.transports.Console(),
      ],
    });

    const config: AxiosRequestConfig = {
      timeout: 10000,
      headers: this.getRandomHeaders(),
    };

    // Proxy Injection if configured in .env
    const proxyUrl = process.env.RESIDENTIAL_PROXY_URL;
    if (proxyUrl) {
      config.httpsAgent = new HttpsProxyAgent(proxyUrl);
      this.logger.info('Using residential proxy for requests');
    }

    this.axiosInstance = axios.create(config);

    // Resilience: Automatic Retries with Exponential Backoff
    this.setupInterceptors();
  }

  /**
   * Rotates User-Agents and mobile device fingerprints to avoid detection.
   */
  protected getRandomHeaders(): Record<string, string> {
    const userAgents = [
      'Zepto/2.42.0 (iPhone; iOS 17.4.1; Scale/3.00)',
      'Blinkit/Nexus-6P/Android-13',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    ];

    return {
      'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-device-id': Math.random().toString(36).substring(7),
      'x-app-version': '2.42.0',
    };
  }

  /**
   * Setup Axios interceptors for retries on rate limits (429) or forbidden (403).
   */
  private setupInterceptors() {
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const { config, response } = error;
        if (!config || !response) return Promise.reject(error);

        // Retry logic for 403/429 with exponential backoff
        if ([403, 429].includes(response.status) && !config._retry) {
          config._retry = true;
          const delay = Math.pow(2, (config._retryCount || 0)) * 1000;
          config._retryCount = (config._retryCount || 0) + 1;
          
          if (config._retryCount <= 3) {
            this.logger.warn(`Rate limited or blocked. Retrying in ${delay}ms... (Attempt ${config._retryCount})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.axiosInstance(config);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Abstract method to be implemented by specific platform scrapers.
   */
  abstract searchProduct(query: string, lat: number, lng: number): Promise<StandardizedProduct[]>;
}
