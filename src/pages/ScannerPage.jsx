import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
// Using NIFTY_500 for metadata (names/sectors)
import { NIFTY_500 } from '../data/nseUniverse'; 
import { getStockCurrentPrice, getStockHistory } from '../data/mockData';
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

/* ── Lightweight Sparkline Chart ── */
function MiniChart({ symbol }) {
  const history = useMemo(() => getStockHistory(symbol), [symbol]);
  
  const data = {
    labels: history.dates.slice(-20),
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
      studies: ['RSI@tv-basicstudies', 'MAExp@tv-basicstudies'],
    });

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    containerRef.current.appendChild(widgetDiv);
    containerRef.current.appendChild(script);

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [symbol]);

  const handleOverlayClick = (e) => { if (e.target === overlayRef.current) onClose(); };

  return (
    <div className="chart-modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="chart-modal animate-fadeInUp">
        <div className="chart-modal-header">
          <div className="chart-modal-title">
            <span className="pulse-dot green"></span>
            <span>NSE:{symbol} — Advanced Chart</span>
          </div>
          <button className="chart-modal-close" onClick={onClose}>
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

export default function ScannerPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSignal, setFilterSignal] = useState('ALL');
  const [filterSector, setFilterSector] = useState('ALL');
  const [sortBy, setSortBy] = useState('symbol');
  const [sortDir, setSortDir] = useState('asc');
  const [selectedStock, setSelectedStock] = useState(null);
  
  const [stocksWithIndicators, setStocksWithIndicators] = useState([]);
  const [loadingScanner, setLoadingScanner] = useState(true);

  // --- New Pagination States ---
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50; 

  // Fetch Full 500 List from Hugging Face
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoadingScanner(true);
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://ssb1000-algotrading.hf.space';
        const res = await fetch(`${backendUrl}/api/scan/nifty500`);
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        
        // Use the 'stocks' array from backend
        const stocksList = data.stocks || [];
        
        if (isMounted) {
          const merged = stocksList.map(apiStock => {
            const meta = NIFTY_500.find(s => s.symbol === apiStock.symbol) || { name: apiStock.symbol, sector: 'Others' };
            return {
              ...apiStock,
              name: meta.name,
              sector: meta.sector,
              stochK: apiStock.stochK || null,
              stochD: apiStock.stochD || null,
              ema200: apiStock.ema200 || null,
              ich_span_a: apiStock.ich_span_a || null,
              ich_span_b: apiStock.ich_span_b || null,
              signal: apiStock.signal || 'NEUTRAL'
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
        (s.symbol || '').toLowerCase().includes(term) || (s.name || '').toLowerCase().includes(term)
      );
    }
    if (filterSignal !== 'ALL') {
      result = result.filter(s => {
        const sig = (s.signal || '').toUpperCase();
        if (filterSignal === 'BUY') return sig.includes('BUY');
        if (filterSignal === 'SELL') return sig.includes('SELL');
        if (filterSignal === 'NEUTRAL') return !sig.includes('BUY') && !sig.includes('SELL');
        return true;
      });
    }
    if (filterSector !== 'ALL') {
      result = result.filter(s => s.sector === filterSector);
    }

    result.sort((a, b) => {
      let valA = a[sortBy] ?? '';
      let valB = b[sortBy] ?? '';
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
    BUY: stocksWithIndicators.filter(s => (s.signal || '').toUpperCase().includes('BUY')).length,
    SELL: stocksWithIndicators.filter(s => (s.signal || '').toUpperCase().includes('SELL')).length,
    NEUTRAL: stocksWithIndicators.filter(s => {
        const sig = (s.signal || '').toUpperCase();
        return !sig.includes('BUY') && !sig.includes('SELL');
    }).length,
  }), [stocksWithIndicators]);

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span style={{ opacity: 0.3 }}>⇅</span>;
    return sortDir === 'asc' ? <span>↑</span> : <span>↓</span>;
  };

  const getRSIColor = (rsi) => {
    if (rsi == null) return 'var(--c-text-muted)';
    if (rsi < 30) return 'var(--c-profit)';
    if (rsi > 70) return 'var(--c-loss)';
    return 'var(--c-text-secondary)';
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h2>Stock Scanner (NIFTY 500)</h2>
        <p>Screen NSE stocks using technical indicators — RSI, MACD, Stochastic RSI, EMA (20/50/200) & Ichimoku Cloud. Click any stock to view its live chart.</p>
      </div>

      {/* Summary Cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px' }}>
        <div className="stat-card" onClick={() => setFilterSignal('BUY')} style={{ cursor: 'pointer', borderColor: filterSignal === 'BUY' ? '#10b981' : 'transparent' }}>
          <div className="stat-label">Buy Signals</div>
          <div className="stat-value profit">{signalCounts.BUY}</div>
        </div>
        <div className="stat-card" onClick={() => setFilterSignal('SELL')} style={{ cursor: 'pointer', borderColor: filterSignal === 'SELL' ? '#ef4444' : 'transparent' }}>
          <div className="stat-label">Sell Signals</div>
          <div className="stat-value loss">{signalCounts.SELL}</div>
        </div>
        <div className="stat-card" onClick={() => setFilterSignal('NEUTRAL')} style={{ cursor: 'pointer', borderColor: filterSignal === 'NEUTRAL' ? '#64748b' : 'transparent' }}>
          <div className="stat-label">Neutral</div>
          <div className="stat-value">{signalCounts.NEUTRAL}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <input className="search-input" type="text" placeholder="Search Nifty 500..." value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} />
        </div>
        <select className="form-select" value={filterSector} onChange={(e) => {setFilterSector(e.target.value); setCurrentPage(1);}}>
          {sectors.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Sectors' : s}</option>)}
        </select>
      </div>

      {/* Table Container */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('symbol')} style={{ cursor: 'pointer' }}>Symbol <SortIcon col="symbol" /></th>
                <th>Sector</th>
                <th onClick={() => handleSort('price')} style={{ cursor: 'pointer' }}>Price <SortIcon col="price" /></th>
                <th onClick={() => handleSort('changePercent')} style={{ cursor: 'pointer' }}>Change <SortIcon col="changePercent" /></th>
                <th style={{ width: '100px' }}>Sparkline</th>
                <th onClick={() => handleSort('rsi')} style={{ cursor: 'pointer' }}>RSI <SortIcon col="rsi" /></th>
                <th>MACD</th>
                <th onClick={() => handleSort('stochK')} style={{ cursor: 'pointer' }}>Stoch RSI <SortIcon col="stochK" /></th>
                <th>EMA 20/50</th>
                <th>EMA 200</th>
                <th>Ichimoku</th>
                <th onClick={() => handleSort('signal')} style={{ cursor: 'pointer' }}>Signal <SortIcon col="signal" /></th>
              </tr>
            </thead>
            <tbody>
              {loadingScanner ? (
                <tr><td colSpan="12" style={{ textAlign: 'center', padding: '40px' }}>Analyzing Market Data...</td></tr>
              ) : currentTableData.length > 0 ? currentTableData.map(stock => {
                const isBuy = (stock.signal || '').toUpperCase().includes('BUY');
                const isSell = (stock.signal || '').toUpperCase().includes('SELL');
                const signalClass = isBuy ? 'badge-buy' : isSell ? 'badge-sell' : 'badge-neutral';
                
                return (
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
                    <td style={{ fontWeight: 600 }}>₹{(stock.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className={(stock.changePercent || 0) >= 0 ? 'text-profit' : 'text-loss'} style={{ fontWeight: 600 }}>
                      {(stock.changePercent || 0) >= 0 ? '+' : ''}{(stock.changePercent || 0).toFixed(2)}%
                    </td>
                    <td>
                      <div className="mini-chart-cell">
                        <MiniChart symbol={stock.symbol} />
                      </div>
                    </td>
                    <td style={{ color: getRSIColor(stock.rsi), fontWeight: 600 }}>
                      {stock.rsi !== null && stock.rsi !== undefined ? stock.rsi.toFixed(1) : '—'}
                    </td>
                    <td>
                      <div style={{ fontSize: '11px' }}>
                        <span style={{ color: (stock.macdHist || 0) >= 0 ? 'var(--c-profit)' : 'var(--c-loss)' }}>
                          H: {(stock.macdHist || 0).toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '11px' }}>
                        <span>K: {stock.stochK !== null && stock.stochK !== undefined ? stock.stochK.toFixed(1) : '—'}</span>
                        {' '}
                        <span style={{ color: 'var(--c-text-muted)' }}>D: {stock.stochD !== null && stock.stochD !== undefined ? stock.stochD.toFixed(1) : '—'}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '11px' }}>
                      <div style={{ color: 'var(--c-text-primary)' }}>₹{(stock.ema20 || 0).toFixed(0)}</div>
                      <div style={{ color: 'var(--c-text-muted)', fontSize: '10px' }}>₹{(stock.ema50 || 0).toFixed(0)}</div>
                    </td>
                    <td style={{ fontSize: '12px', fontWeight: 600 }}>₹{(stock.ema200 || 0).toFixed(0)}</td>
                    <td style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>
                      <div style={{ color: (stock.price > stock.ich_span_a && stock.price > stock.ich_span_b) ? 'var(--c-profit)' : 'var(--c-loss)' }}>
                        Span A: {(stock.ich_span_a || 0).toFixed(1)}
                      </div>
                      <div style={{ color: 'var(--c-text-muted)' }}>Span B: {(stock.ich_span_b || 0).toFixed(1)}</div>
                    </td>
                    <td>
                      <span className={`badge ${signalClass}`}>
                        {stock.signal || 'NEUTRAL'}
                      </span>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                   <td colSpan="12" style={{ textAlign: 'center', padding: 'var(--sp-xl)' }}>No matching stocks found in NIFTY 500.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* --- Pagination Controls --- */}
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--c-bg-card)' }}>
          <div style={{ fontSize: '12px', color: 'var(--c-text-muted)' }}>
            Showing {filteredStocks.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} to {Math.min(currentPage * rowsPerPage, filteredStocks.length)} of {filteredStocks.length} stocks
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)}>Prev</button>
            <span style={{ fontSize: '13px' }}>Page {currentPage} of {Math.max(1, Math.ceil(filteredStocks.length / rowsPerPage))}</span>
            <button className="btn btn-secondary btn-sm" disabled={currentPage >= Math.ceil(filteredStocks.length / rowsPerPage)} onClick={() => setCurrentPage(c => c + 1)}>Next</button>
          </div>
        </div>
      </div>

      {selectedStock && <ChartModal symbol={selectedStock} onClose={() => setSelectedStock(null)} />}
    </div>
  );
}