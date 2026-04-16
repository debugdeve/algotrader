import { redis } from '../config/redis';
import { AuthService, ApiKeyConfig } from './AuthService';

export class KeyManager {
  private static pool: ApiKeyConfig[] = JSON.parse(process.env.API_KEYS_POOL || '[]');
  private static currentIndex = 0;

  /**
   * Returns the next available access token in a round-robin fashion.
   * If a token is missing, it attempts to refresh it.
   */
  static async getNextActiveToken(): Promise<string | null> {
    if (this.pool.length === 0) return null;

    const startIdx = this.currentIndex;
    
    // Try each key in the pool once
    for (let i = 0; i < this.pool.length; i++) {
        const idx = (startIdx + i) % this.pool.length;
        const config = this.pool[idx];
        
        let token = await redis.get(`fyers:token:${config.clientId}`);
        
        if (!token) {
            // Attempt an on-demand refresh if token is expired/missing
            token = await AuthService.refreshKey(config);
        }

        if (token) {
            this.currentIndex = (idx + 1) % this.pool.length;
            return token;
        }
    }

    return null;
  }

  /**
   * Specifically returns the token for a given client ID
   */
  static async getTokenForClient(clientId: string): Promise<string | null> {
    const token = await redis.get(`fyers:token:${clientId}`);
    if (!token) {
        const config = this.pool.find(c => c.clientId === clientId);
        if (config) return AuthService.refreshKey(config);
    }
    return token;
  }

  static getPoolSize(): number {
    return this.pool.length;
  }
}
