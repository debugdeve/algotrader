// ICICI Direct Breeze API Service Layer
// Proxies all requests safely through our local Python Backend.
import config from '../config';

class BreezeApiService {
  constructor() {
    this.BACKEND_URL = `${config.API_BASE_URL}/breeze`;
  }

  async getLoginUrl(apiKey) {
    const response = await fetch(`${this.BACKEND_URL}/login?api_key=${apiKey}`);
    return response.json();
  }

  async generateSession(apiKey, apiSecret, sessionToken) {
    const response = await fetch(`${this.BACKEND_URL}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, api_secret: apiSecret, session_token: sessionToken }),
    });
    return response.json();
  }

  async getHoldings() {
    const response = await fetch(`${this.BACKEND_URL}/portfolio`);
    return response.json();
  }

  async placeOrder(orderData) {
    const response = await fetch(`${this.BACKEND_URL}/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    return response.json();
  }
}

const breezeApi = new BreezeApiService();
export default breezeApi;
