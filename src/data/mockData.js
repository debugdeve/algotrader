export const NSE_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', sector: 'Energy' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd.', sector: 'IT' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', sector: 'Banking' },
  { symbol: 'INFY', name: 'Infosys Ltd.', sector: 'IT' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', sector: 'Banking' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd.', sector: 'Consumer Goods' },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', sector: 'Telecom' },
  { symbol: 'ITC', name: 'ITC Ltd.', sector: 'Consumer Goods' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd.', sector: 'Banking' },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd.', sector: 'Construction' },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd.', sector: 'Banking' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd.', sector: 'Consumer Goods' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd.', sector: 'Automobile' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries Ltd.', sector: 'Healthcare' },
];

export const PORTFOLIO_POSITIONS = [
  { 
    id: 'pos1',
    symbol: 'RELIANCE', 
    name: 'Reliance Industries',
    qty: 10, 
    avgPrice: 2450.50, 
    currentPrice: 2510.75, 
    pnl: 602.50, 
    pnlPercent: 2.45, 
    broker: 'ZERODHA' 
  },
  { 
    id: 'pos2',
    symbol: 'TCS', 
    name: 'Tata Consultancy Services',
    qty: 5, 
    avgPrice: 3200.00, 
    currentPrice: 3180.20, 
    pnl: -99.00, 
    pnlPercent: -0.62, 
    broker: 'ZERODHA' 
  },
  { 
    id: 'pos3',
    symbol: 'HDFCBANK', 
    name: 'HDFC Bank',
    qty: 20, 
    avgPrice: 1550.00, 
    currentPrice: 1580.45, 
    pnl: 609.00, 
    pnlPercent: 1.96, 
    broker: 'ICICI_BREEZE' 
  },
  { 
    id: 'pos4',
    symbol: 'INFY', 
    name: 'Infosys Ltd',
    qty: 15, 
    avgPrice: 1420.00, 
    currentPrice: 1445.30, 
    pnl: 379.50, 
    pnlPercent: 1.78, 
    broker: 'ICICI_BREEZE' 
  }
];

export const SECTOR_ALLOCATION = [
  { name: 'Energy', value: 25 },
  { name: 'IT', value: 20 },
  { name: 'Banking', value: 30 },
  { name: 'Healthcare', value: 10 },
  { name: 'Others', value: 15 },
];

export const MOCK_ORDERS = [
  { id: 'ORD001', symbol: 'RELIANCE', type: 'BUY', qty: 10, price: 2510.75, status: 'COMPLETE', time: '11:30 AM', broker: 'ZERODHA' },
  { id: 'ORD002', symbol: 'TCS', type: 'SELL', qty: 5, price: 3180.20, status: 'COMPLETE', time: '12:15 PM', broker: 'ZERODHA' },
  { id: 'ORD003', symbol: 'HDFCBANK', type: 'BUY', qty: 20, price: 1580.45, status: 'COMPLETE', time: '02:00 PM', broker: 'ICICI_BREEZE' },
];

export const getStockHistory = (symbol) => {
  const dates = [];
  const closes = [];
  const volumes = [];
  
  let currentPrice = 1500 + Math.random() * 1000;
  
  for (let i = 100; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
    
    const change = (Math.random() - 0.48) * (currentPrice * 0.02);
    currentPrice += change;
    closes.push(parseFloat(currentPrice.toFixed(2)));
    volumes.push(Math.floor(Math.random() * 1000000) + 500000);
  }
  
  return { dates, closes, volumes };
};

export const getStockCurrentPrice = (symbol) => {
  const base = 500 + Math.random() * 2000;
  return {
    price: parseFloat(base.toFixed(2)),
    change: parseFloat((Math.random() * 50 - 25).toFixed(2)),
    changePercent: parseFloat((Math.random() * 4 - 2).toFixed(2)),
    volume: Math.floor(Math.random() * 1000000)
  };
};

// Shopping app stubs to prevent build errors in orphaned files
export const MOCK_PRODUCTS = [];
export const PLATFORMS = {};
export const getMockResults = () => [];
