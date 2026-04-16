import { SymbolUtils } from '../utils/SymbolUtils';
import { KeyManager } from '../services/KeyManager';
import { SocketWorker } from './SocketWorker';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

export class SocketPooler {
  private workers: SocketWorker[] = [];

  constructor() {}

  /**
   * Initializes the 10-page multiplexer
   */
  async start() {
    const chunks = SymbolUtils.getChunks(50);
    logger.info(`Initializing ${chunks.length} workers for AlgoTrader Pro aggregation.`);

    for (const chunk of chunks) {
      const accessToken = await KeyManager.getNextActiveToken();
      if (!accessToken) {
        logger.error(`Failed to acquire token for Worker ${chunk.pageId}. Skipping...`);
        continue;
      }

      const worker = new SocketWorker(chunk.pageId, chunk.symbols, accessToken);
      this.workers.push(worker);
      
      // Stagger connections to avoid burst rate limits
      await worker.connect();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  async stopAll() {
    for (const worker of this.workers) {
      await worker.stop();
    }
    this.workers = [];
  }
}
