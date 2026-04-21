const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://ssb1000-algotrading.hf.space/api',
  WS_URL: import.meta.env.VITE_WS_URL || 'wss://ssb1000-algotrading.hf.space/ws'
};

export default config;
