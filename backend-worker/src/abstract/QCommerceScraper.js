"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QCommerceScraper = void 0;
const axios_1 = __importStar(require("axios"));
const https_proxy_agent_1 = require("https-proxy-agent");
const dotenv = __importStar(require("dotenv"));
const winston_1 = __importDefault(require("winston"));
dotenv.config();
/**
 * Abstract Base Class for all Quick-Commerce Scrapers.
 * Handles header rotation, proxy injection, and resilience logic.
 */
class QCommerceScraper {
    axiosInstance;
    logger;
    platformName;
    constructor(platformName) {
        this.platformName = platformName;
        this.logger = winston_1.default.createLogger({
            level: 'info',
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
            defaultMeta: { service: `${platformName}-scraper` },
            transports: [
                new winston_1.default.transports.Console(),
            ],
        });
        const config = {
            timeout: 10000,
            headers: this.getRandomHeaders(),
        };
        // Proxy Injection if configured in .env
        const proxyUrl = process.env.RESIDENTIAL_PROXY_URL;
        if (proxyUrl) {
            config.httpsAgent = new https_proxy_agent_1.HttpsProxyAgent(proxyUrl);
            this.logger.info('Using residential proxy for requests');
        }
        this.axiosInstance = axios_1.default.create(config);
        // Resilience: Automatic Retries with Exponential Backoff
        this.setupInterceptors();
    }
    /**
     * Rotates User-Agents and mobile device fingerprints to avoid detection.
     */
    getRandomHeaders() {
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
    setupInterceptors() {
        this.axiosInstance.interceptors.response.use((response) => response, async (error) => {
            const { config, response } = error;
            if (!config || !response)
                return Promise.reject(error);
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
        });
    }
}
exports.QCommerceScraper = QCommerceScraper;
//# sourceMappingURL=QCommerceScraper.js.map