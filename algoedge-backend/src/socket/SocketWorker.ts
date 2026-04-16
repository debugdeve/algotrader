import { fyersDataSocket } from 'fyers-api-v3';
import { redis } from '../config/redis';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/worker.log' }),
    new winston.transports.Console()
  ]
});

export class SocketWorker {
  private socket: any;
  private symbols: string[];
  private pageId: number;
  private accessToken: string;
  private lastPrices: Map<string, number> = new Map();

  constructor(pageId: number, symbols: string[], accessToken: string) {
    this.pageId = pageId;
    this.symbols = symbols;
    this.accessToken = accessToken;
  }

  async connect() {
    try {
      this.socket = new fyersDataSocket();
      this.socket.setAccessToken(this.accessToken);

      this.socket.on('connect', () => {
        logger.info(`Worker ${this.pageId} connected.`);
        this.subscribe();
      });

      this.socket.on('message', async (message: any) => {
        if (message.type === 'dp') { // Data Packet
            await this.handleTick(message);
        }
      });

      this.socket.on('error', (err: any) => {
        logger.error(`Worker ${this.pageId} error: ${err.message}`);
      });

      this.socket.on('close', () => {
        logger.warn(`Worker ${this.pageId} closed. Reconnecting in 5s...`);
        setTimeout(() => this.connect(), 5000);
      });

      this.socket.connect();
    } catch (error: any) {
      logger.error(`Failed to start Worker ${this.pageId}: ${error.message}`);
    }
  }

  private subscribe() {
    // Subscribe to symbols in chunks of 50 (Fyers limit)
    this.socket.subscribe(this.symbols.map(s => `NSE:${s}-EQ`));
    this.socket.autoreconnect();
  }

  private async handleTick(data: any) {
    const symbol = data.symbol.replace('NSE:', '').replace('-EQ', '');
    const ltp = data.ltp;

    // Optimization: Only publish if price changed
    if (this.lastPrices.get(symbol) === ltp) return;
    this.lastPrices.set(symbol, ltp);

    const payload = JSON.stringify({
      s: symbol,
      p: ltp,
      v: data.vol || 0,
      t: Date.now()
    });

    // 1. Update Latest Hash
    await redis.hset('nifty500:latest', symbol, payload);

    // 2. Publish to Page Channel
    await redis.publish(`ticker:page:${this.pageId}`, payload);
  }

  async stop() {
    if (this.socket) {
      this.socket.close();
    }
  }
}
