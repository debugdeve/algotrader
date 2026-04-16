import axios from 'axios';
import { authenticator } from 'otplib';
import { fyersModel } from 'fyers-api-v3';
import { redis } from '../config/redis';
import dotenv from 'dotenv';
import winston from 'winston';

dotenv.config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/critical.log', level: 'error' }),
    new winston.transports.Console()
  ]
});

export interface ApiKeyConfig {
  clientId: string;
  secret: string;
  totpSecret: string;
  pin: string;
}

export class AuthService {
  private static pool: ApiKeyConfig[] = JSON.parse(process.env.API_KEYS_POOL || '[]');

  /**
   * Performs the headless login flow for a single API key
   */
  static async refreshKey(config: ApiKeyConfig): Promise<string | null> {
    try {
      const { clientId, secret, totpSecret, pin } = config;

      // 1. Generate TOTP
      const totpCode = authenticator.generate(totpSecret);

      // 2. Headless Step 1: Validate fy_id
      const step1Res = await axios.post('https://api-t1.fyers.in/api/v3/validate-step1', {
        fy_id: clientId,
        app_id: '2'
      });

      if (step1Res.data.s !== 'ok') throw new Error(`Step 1 failed for ${clientId}: ${step1Res.data.message}`);
      const requestKey = step1Res.data.request_key;

      // 3. Headless Step 2: Validate TOTP & PIN
      const step2Res = await axios.post('https://api-t1.fyers.in/api/v3/validate-step2', {
        request_key: requestKey,
        otp: totpCode,
        pin: pin
      });

      if (step2Res.data.s !== 'ok') throw new Error(`Step 2 (TOTP) failed for ${clientId}: ${step2Res.data.message}`);
      const sessionToken = step2Res.data.data.token;

      // 4. Generate Auth Code
      const authCodeRes = await axios.post('https://api-t1.fyers.in/api/v3/generate-authcode', {
        client_id: clientId,
        redirect_uri: process.env.REDIRECT_URI || 'http://localhost:3000',
        response_type: 'code',
        state: 'sample_state'
      }, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });

      if (authCodeRes.data.s !== 'ok') throw new Error(`Auth Code generation failed for ${clientId}: ${authCodeRes.data.message}`);
      const authCode = authCodeRes.data.data.auth_code;

      // 5. Exchange Auth Code for Access Token using SDK
      const fyers = new fyersModel();
      fyers.setAppId(clientId);
      fyers.setRedirectUrl(process.env.REDIRECT_URI || 'http://localhost:3000');

      const tokenResponse: any = await fyers.generate_access_token({
        client_id: clientId,
        secret_key: secret,
        auth_code: authCode
      });

      if (tokenResponse.s !== 'ok') throw new Error(`Token exchange failed for ${clientId}: ${tokenResponse.message}`);

      const accessToken = tokenResponse.access_token;
      
      // Store in Redis
      await redis.set(`fyers:token:${clientId}`, accessToken, 'EX', 86400); // 24h
      logger.info(`Successfully refreshed token for ${clientId}`);

      return accessToken;
    } catch (error: any) {
      logger.error({
        message: 'Fyers Headless Auth Failure',
        clientId: config.clientId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return null;
    }
  }

  /**
   * Refreshes all keys in the pool
   */
  static async refreshAllKeys() {
    let successCount = 0;
    for (const config of this.pool) {
      const token = await this.refreshKey(config);
      if (token) successCount++;
    }

    const failureRate = (this.pool.length - successCount) / this.pool.length;
    if (failureRate > 0.2) {
      this.triggerCriticalAlert(successCount, this.pool.length);
    }
    
    return { successCount, total: this.pool.length };
  }

  private static triggerCriticalAlert(success: number, total: number) {
    const message = `CRITICAL: Fyers Token Pool Health is low. Success: ${success}/${total}`;
    logger.error(message);
    
    // Mock Discord Webhook
    if (process.env.DISCORD_WEBHOOK_URL) {
      axios.post(process.env.DISCORD_WEBHOOK_URL, { content: message }).catch(() => {});
    }
  }
}
