import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { NIFTY_500 } from '../data/nseUniverse';
import { getStockCurrentPrice } from '../data/mockData';
import { calculateRSI, calculateMACD, calculateStochRSI, calculateEMA, getSignal } from '../utils/indicators';
import ScannerInput from '../components/ScannerInput';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

/* ── Lightweight Sparkline Chart (Fixes browser freezing from 200 TV Widgets) ── */
function MiniChart({ symbol }) {
  const history = useMemo(() => getStockHistory(symbol), [symbol]);
  
  const data = {
    labels: history.dates.slice(-20), // Last 20 days
    datasets: [{
      data: history.closes.slice(-20),
      borderColor: history.closes[history.closes.length-1] >= history.closes[history.closes.length-2] ? '#10b981' : '#ef4444',
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.2,
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: { x: { display: false }, y: { display: false } },
    layout: { padding: 0 }
  };

  return (
    <div style={{ height: '30px', width: '80px', margin: '0 auto' }}>
      <Line data={data} options={options} />
    </div>
  );
}

/* ── TradingView Advanced Chart Modal ── */
function ChartModal({ symbol, onClose }) {
  const containerRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !symbol) return;
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `BSE:${symbol.replace('&', '_')}`,
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
      hotlist: false,
      backgroundColor: 'rgba(10, 14, 23, 1)',
      gridColor: 'rgba(148, 163, 184, 0.06)',
      studies: [
        'RSI@tv-basicstudies',
        'MAExp@tv-basicstudies',
      ],
    });

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    containerRef.current.appendChild(widgetDiv);
    containerRef.current.appendChild(script);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [symbol]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!symbol) return null;

  return (
    <div className="chart-modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="chart-modal animate-fadeInUp">
        <div className="chart-modal-header">
          <div className="chart-modal-title">
            <span className="pulse-dot green"></span>
            <span>NSE:{symbol} — Advanced Chart</span>
          </div>
          <button className="chart-modal-close" onClick={onClose} id="close-chart-modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="chart-modal-body">
          <div ref={containerRef} className="tradingview-widget-container" style={{ height: '100%', width: '100%' }} />
        </div>
      </div>
    </div>
  );
}

const calculateMockDataForStock = (stock) => {
  const history = getStockHistory(stock.symbol);
  const closes = history.closes;
  const current = getStockCurrentPrice(stock.symbol);
  const len = closes.length;

  const rsiValues = calculateRSI(closes, 14);
  const macdData = calculateMACD(closes, 12, 26, 9);
  const stochData = calculateStochRSI(closes, 14, 14, 3, 3);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);

  const rsi = rsiValues[len - 1];
  const macdHist = macdData.histogram[len - 1];
  const macdLine = macdData.macd[len - 1];
  const macdSignalLine = macdData.signal[len - 1];
  const stochK = stochData.k[len - 1];
  const stochD = stochData.d[len - 1];
  const ema20Val = ema20[len - 1];
  const ema50Val = ema50[len - 1];

  const signal = getSignal(rsi, macdHist, stochK);

  return {
    ...stock,
    price: current.price,
    change: current.change,
    changePercent: current.changePercent,
    volume: current.volume,
    rsi: rsi !== null ? Math.round(rsi * 100) / 100 : null,
    macdLine: Math.round(macdLine * 100) / 100,
    macdSignal: Math.round(macdSignalLine * 100) / 100,
    macdHist: Math.round(macdHist * 100) / 100,
    stochK: stochK !== null ? Math.round(stochK * 100) / 100 : null,
    stochD: stochD !== null ? Math.round(stochD * 100) / 100 : null,
    ema20: Math.round(ema20Val * 100) / 100,
    ema50: Math.round(ema50Val * 100) / 100,
    signal,
    isLive: false
  };
};

export default function ScannerPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSignal, setFilterSignal] = useState('ALL');
  const [filterSector, setFilterSector] = useState('ALL');
  const [sortBy, setSortBy] = useState('symbol');
  const [sortDir, setSortDir] = useState('asc');
  const [selectedStock, setSelectedStock] = useState(null);
  
  const [stocksWithIndicators, setStocksWithIndicators] = useState([]);
  const [loadingScanner, setLoadingScanner] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  // Fetch from Python FastAPI Backend using vectorized NIFTY 500 endpoint
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoadingScanner(true);
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
        const res = await fetch(`${backendUrl}/api/scan/nifty500`);
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        
        if (data.stocks && isMounted) {
          const merged = data.stocks.map(apiStock => {
            const meta = NIFTY_500.find(s => s.symbol === apiStock.symbol) || { name: apiStock.symbol, sector: 'Others' };
            return {
              ...apiStock,
              name: meta.name,
              sector: meta.sector,
              stochK: null,
              stochD: null,
            };
          });
          setStocksWithIndicators(merged);
        }
      } catch (err) {
        console.error("Failed to fetch Nifty 500", err);
      } finally {
        if (isMounted) setLoadingScanner(false);
      }
    }
    
    loadData();
    return () => { isMounted = false; };
  }, []);

  const sectors = useMemo(() => ['ALL', ...new Set(NIFTY_500.map(s => s.sector))], []);

  const filteredStocks = useMemo(() => {
    let result = stocksWithIndicators;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.symbol.toLowerCase().includes(term) || s.name.toLowerCase().includes(term)
      );
    }
    if (filterSignal !== 'ALL') {
      result = result.filter(s => s.signal === filterSignal);
    }
    if (filterSector !== 'ALL') {
      result = result.filter(s => s.sector === filterSector);
    }

    result.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [stocksWithIndicators, searchTerm, filterSignal, filterSector, sortBy, sortDir]);

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const currentTableData = useMemo(() => {
    const firstPageIndex = (currentPage - 1) * rowsPerPage;
    return filteredStocks.slice(firstPageIndex, firstPageIndex + rowsPerPage);
  }, [currentPage, filteredStocks]);

  const signalCounts = useMemo(() => ({
    BUY: stocksWithIndicators.filter(s => s.signal === 'BUY').length,
    SELL: stocksWithIndicators.filter(s => s.signal === 'SELL').length,
    NEUTRAL: stocksWithIndicators.filter(s => s.signal === 'NEUTRAL').length,
  }), [stocksWithIndicators]);

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span style={{ opacity: 0.3 }}>⇅</span>;
    return sortDir === 'asc' ? <span>↑</span> : <span>↓</span>;
  };

  const getRSIColor = (rsi) => {
    if (rsi === null) return 'var(--c-text-muted)';
    if (rsi < 30) return 'var(--c-profit)';
    if (rsi > 70) return 'var(--c-loss)';
    return 'var(--c-text-secondary)';
  };

  const handleCloseModal = useCallback(() => setSelectedStock(null), []);

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h2>Stock Scanner</h2>
        <p>Screen NSE stocks using technical indicators — RSI, MACD, Stochastic RSI & EMA. Click any stock to view its live chart.</p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <ScannerInput />
      </div>

      {/* Signal Summary Cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card" onClick={() => setFilterSignal(filterSignal === 'BUY' ? 'ALL' : 'BUY')} style={{ cursor: 'pointer', borderColor: filterSignal === 'BUY' ? 'rgba(16, 185, 129, 0.3)' : undefined }}>
          <div className="stat-label">Buy Signals</div>
          <div className="stat-value profit">{signalCounts.BUY}</div>
          <div className="stat-change text-profit">RSI oversold / bullish crossover</div>
        </div>
        <div className="stat-card" onClick={() => setFilterSignal(filterSignal === 'SELL' ? 'ALL' : 'SELL')} style={{ cursor: 'pointer', borderColor: filterSignal === 'SELL' ? 'rgba(239, 68, 68, 0.3)' : undefined }}>
          <div className="stat-label">Sell Signals</div>
          <div className="stat-value loss">{signalCounts.SELL}</div>
          <div className="stat-change text-loss">RSI overbought / bearish crossover</div>
        </div>
        <div className="stat-card" onClick={() => setFilterSignal(filterSignal === 'NEUTRAL' ? 'ALL' : 'NEUTRAL')} style={{ cursor: 'pointer', borderColor: filterSignal === 'NEUTRAL' ? 'rgba(100, 116, 139, 0.3)' : undefined }}>
          <div className="stat-label">Neutral</div>
          <div className="stat-value">{signalCounts.NEUTRAL}</div>
          <div className="stat-change text-muted">No clear signal</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            type="text"
            placeholder="Search Nifty 500..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            id="scanner-search"
          />
        </div>
        <select
          className="form-select"
          value={filterSector}
          onChange={(e) => { setFilterSector(e.target.value); setCurrentPage(1); }}
          style={{ width: '180px', flex: 'none' }}
          id="sector-filter"
        >
          {sectors.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Sectors' : s}</option>)}
        </select>
        <select
          className="form-select"
          value={filterSignal}
          onChange={(e) => { setFilterSignal(e.target.value); setCurrentPage(1); }}
          style={{ width: '150px', flex: 'none' }}
          id="signal-filter"
        >
          <option value="ALL">All Signals</option>
          <option value="BUY">Buy Only</option>
          <option value="SELL">Sell Only</option>
          <option value="NEUTRAL">Neutral Only</option>
        </select>
      </div>

      {/* Scanner Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <table id="scanner-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('symbol')} style={{ cursor: 'pointer' }}>Symbol <SortIcon col="symbol" /></th>
                <th>Sector</th>
                <th onClick={() => handleSort('price')} style={{ cursor: 'pointer' }}>Price <SortIcon col="price" /></th>
                <th onClick={() => handleSort('changePercent')} style={{ cursor: 'pointer' }}>Change <SortIcon col="changePercent" /></th>
                <th style={{ width: '100px' }}>Sparkline</th>
                <th onClick={() => handleSort('rsi')} style={{ cursor: 'pointer' }}>RSI (14) <SortIcon col="rsi" /></th>
                <th>MACD</th>
                <th onClick={() => handleSort('stochK')} style={{ cursor: 'pointer' }}>Stoch RSI <SortIcon col="stochK" /></th>
                <th>EMA 20</th>
                <th>EMA 50</th>
                <th onClick={() => handleSort('signal')} style={{ cursor: 'pointer' }}>Signal <SortIcon col="signal" /></th>
              </tr>
            </thead>
            <tbody>
              {loadingScanner ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: 'var(--sp-xl)' }}>
                    <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', margin: '0 auto var(--sp-sm)' }}></div>
                    <div style={{ color: 'var(--c-text-muted)' }}>Broad Market Bulk Download in progress. Fetching NIFTY 500 variables... (takes ~15 sec)</div>
                  </td>
                </tr>
              ) : currentTableData.length > 0 ? currentTableData.map(stock => (
                <tr
                  key={stock.symbol}
                  onClick={() => setSelectedStock(stock.symbol)}
                  className="scanner-row-clickable"
                  title={`Click to view NSE:${stock.symbol} chart`}
                >
                  <td>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--c-text-primary)' }}>{stock.symbol}</div>
                      <div style={{ fontSize: '10px', color: 'var(--c-text-muted)' }}>{stock.name}</div>
                    </div>
                  </td>
                  <td><span className="badge badge-neutral">{stock.sector}</span></td>
                  <td style={{ fontWeight: 600 }}>₹{stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className={stock.changePercent >= 0 ? 'text-profit' : 'text-loss'} style={{ fontWeight: 600 }}>
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </td>
                  <td>
                    <div className="mini-chart-cell">
                      <MiniChart symbol={stock.symbol} />
                    </div>
                  </td>
                  <td style={{ color: getRSIColor(stock.rsi), fontWeight: 600 }}>
                    {stock.rsi !== null ? stock.rsi.toFixed(1) : '—'}
                  </td>
                  <td>
                    <div style={{ fontSize: '11px' }}>
                      <span style={{ color: stock.macdHist >= 0 ? 'var(--c-profit)' : 'var(--c-loss)' }}>
                        H: {stock.macdHist.toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '11px' }}>
                      <span>K: {stock.stochK !== null ? stock.stochK.toFixed(1) : '—'}</span>
                      {' '}
                      <span style={{ color: 'var(--c-text-muted)' }}>D: {stock.stochD !== null ? stock.stochD.toFixed(1) : '—'}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '12px' }}>₹{stock.ema20.toFixed(0)}</td>
                  <td style={{ fontSize: '12px' }}>₹{stock.ema50.toFixed(0)}</td>
                  <td>
                    <span className={`badge ${stock.signal === 'BUY' ? 'badge-buy' : stock.signal === 'SELL' ? 'badge-sell' : 'badge-neutral'}`}>
                      {stock.signal}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                   <td colSpan="11" style={{ textAlign: 'center', padding: 'var(--sp-xl)' }}>No matching stocks found in NIFTY 500.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: 'var(--sp-sm) var(--sp-md)', borderTop: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)' }}>
            Showing {currentTableData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} to {Math.min(currentPage * rowsPerPage, filteredStocks.length)} of {filteredStocks.length} matched stocks
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
             <button className="btn btn-secondary btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)}>Prev</button>
             <span style={{ fontSize: '13px', color: 'var(--c-text-primary)' }}>Page {currentPage} of {Math.max(1, Math.ceil(filteredStocks.length / rowsPerPage))}</span>
             <button className="btn btn-secondary btn-sm" disabled={currentPage >= Math.ceil(filteredStocks.length / rowsPerPage)} onClick={() => setCurrentPage(c => c + 1)}>Next</button>
          </div>
        </div>
      </div>

      {/* Chart Modal */}
      {selectedStock && (
        <ChartModal symbol={selectedStock} onClose={handleCloseModal} />
      )}
    </div>
  );
}
