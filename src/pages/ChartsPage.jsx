import { useState, useEffect, useRef } from 'react';

export default function ChartsPage() {
  const [symbol, setSymbol] = useState('RELIANCE');
  const [inputValue, setInputValue] = useState('RELIANCE');
  const chartContainerRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clear previous widget
    chartContainerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `BSE:${symbol}`,
      interval: 'D',
      timezone: 'Asia/Kolkata',
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      hide_side_toolbar: false,
      details: true,
      hotlist: true,
      backgroundColor: 'rgba(10, 14, 23, 1)',
      gridColor: 'rgba(148, 163, 184, 0.06)',
      studies: [
        'RSI@tv-basicstudies',
        'MACD@tv-basicstudies',
        'StochasticRSI@tv-basicstudies',
        'BollingerBands@tv-basicstudies',
        'IchimokuCloud@tv-basicstudies',
        'MAExp@tv-basicstudies',
        'MAExp@tv-basicstudies',
        'MAExp@tv-basicstudies',
      ],
      drawings_access: { type: 'black', tools: [{ name: 'Regression Trend' }] },
      enabled_features: ['study_templates'],
      details: true,
      hotlist: true,
      calendar: true,
      show_popup_button: true,
      popup_width: '1000',
      popup_height: '650',
    });

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    chartContainerRef.current.appendChild(widgetContainer);
    chartContainerRef.current.appendChild(script);

    return () => {
      if (chartContainerRef.current) {
        chartContainerRef.current.innerHTML = '';
      }
    };
  }, [symbol]);

  const handleSearch = (e) => {
    e.preventDefault();
    const cleaned = inputValue.trim().toUpperCase().replace('NSE:', '');
    if (cleaned) {
      setSymbol(cleaned);
    }
  };

  const quickSymbols = [
    'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
    'SBIN', 'BHARTIARTL', 'ITC', 'TATAMOTORS', 'BAJFINANCE',
    'WIPRO', 'AXISBANK', 'LT', 'SUNPHARMA', 'TITAN',
  ];

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <div className="page-header" style={{ marginBottom: 'var(--sp-md)' }}>
        <h2>Live Charts</h2>
        <p>Full-screen TradingView Advanced Chart — NSE Stocks</p>
      </div>

      {/* Search Bar */}
      <div className="charts-toolbar">
        <form onSubmit={handleSearch} className="charts-search-form">
          <div className="search-wrapper" style={{ flex: 1 }}>
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              type="text"
              placeholder="Enter NSE stock symbol (e.g. RELIANCE, TCS, INFY)..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              id="chart-symbol-search"
            />
          </div>
          <button type="submit" className="btn btn-primary" id="chart-load-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            </svg>
            Load Chart
          </button>
        </form>

        {/* Quick Symbol Chips */}
        <div className="symbol-chips">
          {quickSymbols.map((s) => (
            <button
              key={s}
              className={`symbol-chip ${symbol === s ? 'active' : ''}`}
              onClick={() => { setSymbol(s); setInputValue(s); }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div className="card tv-chart-fullscreen" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
        <div className="tv-chart-badge">
          <span className="pulse-dot green" style={{ marginRight: '6px' }}></span>
          NSE:{symbol} — Live
        </div>
        <div
          ref={chartContainerRef}
          className="tradingview-widget-container"
          style={{ height: '100%', width: '100%' }}
        />
      </div>
    </div>
  );
}
