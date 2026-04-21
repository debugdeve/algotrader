import { useState, useMemo, useEffect, useRef } from 'react';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { PORTFOLIO_POSITIONS, SECTOR_ALLOCATION } from '../data/mockData';
import kiteApi from '../services/kiteApi';
import breezeApi from '../services/breezeApi';
import OptionChainDashboard from '../components/trading/OptionChainDashboard';
import OrderEntry from '../components/trading/OrderEntry';
import { AnimatePresence } from 'framer-motion';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler, Tooltip, Legend);

/* ── TradingView Ticker Tape Widget ── */
function TickerTape({ symbols }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: symbols.map((s) => ({
        proName: `BSE:${s}`,
        title: s,
      })),
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: 'adaptive',
      colorTheme: 'dark',
      locale: 'en',
    });

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    containerRef.current.appendChild(widgetDiv);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [symbols]);

  return (
    <div className="tv-ticker-tape-wrapper">
      <div ref={containerRef} className="tradingview-widget-container" />
    </div>
  );
}

/* ── TradingView Market Overview Widget ── */
function MarketOverview() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      dateRange: '1D',
      showChart: true,
      locale: 'en',
      largeChartUrl: '',
      isTransparent: true,
      showSymbolLogo: true,
      showFloatingTooltip: true,
      width: '100%',
      height: '100%',
      plotLineColorGrowing: 'rgba(99, 102, 241, 1)',
      plotLineColorFalling: 'rgba(239, 68, 68, 1)',
      gridLineColor: 'rgba(148, 163, 184, 0.06)',
      scaleFontColor: 'rgba(148, 163, 184, 1)',
      belowLineFillColorGrowing: 'rgba(99, 102, 241, 0.08)',
      belowLineFillColorFalling: 'rgba(239, 68, 68, 0.08)',
      belowLineFillColorGrowingBottom: 'rgba(99, 102, 241, 0)',
      belowLineFillColorFallingBottom: 'rgba(239, 68, 68, 0)',
      symbolActiveColor: 'rgba(99, 102, 241, 0.15)',
      tabs: [
        {
          title: 'Indices',
          symbols: [
            { s: 'NSE:NIFTY', d: 'Nifty 50' },
            { s: 'BSE:SENSEX', d: 'Sensex' },
            { s: 'NSE:BANKNIFTY', d: 'Bank Nifty' },
            { s: 'NSE:FINNIFTY', d: 'Nifty Financial' },
            { s: 'NSE:NIFTYIT', d: 'Nifty IT' },
          ],
          originalTitle: 'Indices',
        },
        {
          title: 'Top NSE Stocks',
          symbols: [
            { s: 'BSE:RELIANCE', d: 'Reliance Industries' },
            { s: 'BSE:TCS', d: 'TCS' },
            { s: 'BSE:HDFCBANK', d: 'HDFC Bank' },
            { s: 'BSE:INFY', d: 'Infosys' },
            { s: 'BSE:ICICIBANK', d: 'ICICI Bank' },
            { s: 'BSE:SBIN', d: 'SBI' },
            { s: 'BSE:BHARTIARTL', d: 'Bharti Airtel' },
            { s: 'BSE:ITC', d: 'ITC' },
            { s: 'BSE:BAJFINANCE', d: 'Bajaj Finance' },
            { s: 'BSE:LT', d: 'L&T' },
          ],
          originalTitle: 'Top NSE Stocks',
        },
        {
          title: 'Banking',
          symbols: [
            { s: 'BSE:HDFCBANK', d: 'HDFC Bank' },
            { s: 'BSE:ICICIBANK', d: 'ICICI Bank' },
            { s: 'BSE:SBIN', d: 'SBI' },
            { s: 'BSE:KOTAKBANK', d: 'Kotak Bank' },
            { s: 'BSE:AXISBANK', d: 'Axis Bank' },
          ],
          originalTitle: 'Banking',
        },
      ],
    });

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    containerRef.current.appendChild(widgetDiv);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  return (
    <div ref={containerRef} className="tradingview-widget-container" style={{ height: '100%' }} />
  );
}

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState('1M');
  const [positions, setPositions] = useState(PORTFOLIO_POSITIONS);
  const [selectedStock, setSelectedStock] = useState(null);

  // Fetch live holdings from both brokers
  useEffect(() => {
    let isMounted = true;
    const fetchLiveHoldings = async () => {
      try {
        const [kiteRes, breezeRes] = await Promise.allSettled([
          kiteApi.getHoldings(),
          breezeApi.getHoldings()
        ]);

        let combinedHoldings = [];
        
        if (kiteRes.status === 'fulfilled' && kiteRes.value?.data) {
          combinedHoldings = [...combinedHoldings, ...kiteRes.value.data.map(h => ({ ...h, broker: 'ZERODHA' }))];
        }
        
        if (breezeRes.status === 'fulfilled' && breezeRes.value?.data) {
          combinedHoldings = [...combinedHoldings, ...breezeRes.value.data.map(h => ({ ...h, broker: 'ICICI_BREEZE' }))];
        }

        if (isMounted && combinedHoldings.length > 0) {
          setPositions(combinedHoldings);
        }
      } catch (err) {
        console.warn('Using fallback mock data for holdings due to backend error:', err);
      }
    };
    fetchLiveHoldings();
    return () => { isMounted = false; };
  }, []);

  const holdingSymbols = positions.map((p) => p.symbol);

  // Calculate portfolio summary
  const summary = useMemo(() => {
    let totalInvestment = 0;
    let totalCurrent = 0;

    positions.forEach(pos => {
      totalInvestment += pos.avgPrice * pos.qty;
      totalCurrent += pos.currentPrice * pos.qty;
    });

    const dayPnl = totalCurrent * 0.012;
    const overallPnl = totalCurrent - totalInvestment;
    const overallPnlPercent = (overallPnl / totalInvestment) * 100;

    return {
      totalInvestment,
      totalCurrent,
      dayPnl,
      overallPnl,
      overallPnlPercent,
    };
  }, [positions]);

  // Generate equity curve data
  const equityData = useMemo(() => {
    const days = timeRange === '1W' ? 7 : timeRange === '1M' ? 30 : timeRange === '3M' ? 90 : 365;
    const labels = [];
    const values = [];
    let value = summary.totalInvestment;

    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      labels.push(d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
      value += value * (Math.random() - 0.47) * 0.015;
      values.push(Math.round(value));
    }
    values[values.length - 1] = Math.round(summary.totalCurrent);

    return { labels, values };
  }, [timeRange, summary]);

  const lineChartData = {
    labels: equityData.labels,
    datasets: [{
      label: 'Portfolio Value',
      data: equityData.values,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99, 102, 241, 0.08)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 5,
      borderWidth: 2,
    }],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a2235',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(148, 163, 184, 0.1)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (ctx) => `₹${ctx.parsed.y.toLocaleString('en-IN')}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 10 }, maxTicksLimit: 8 },
        border: { display: false },
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.06)' },
        ticks: {
          color: '#64748b',
          font: { size: 10 },
          callback: (v) => `₹${(v / 100000).toFixed(1)}L`,
        },
        border: { display: false },
      },
    },
  };

  const doughnutData = {
    labels: SECTOR_ALLOCATION.map(s => s.sector),
    datasets: [{
      data: SECTOR_ALLOCATION.map(s => s.percentage),
      backgroundColor: [
        '#6366f1', '#22d3ee', '#10b981', '#f59e0b', '#e879f9', '#ef4444',
      ],
      borderColor: '#0a0e17',
      borderWidth: 3,
      hoverOffset: 8,
    }],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#94a3b8', font: { size: 11 }, padding: 16, usePointStyle: true, pointStyleWidth: 8 },
      },
    },
    cutout: '70%',
  };

  const formatCurrency = (val) => {
    if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="animate-fadeIn" style={{ maxWidth: '1600px', margin: '0 auto' }}>
      {/* Ticker Tape */}
      <div style={{ marginBottom: 'var(--sp-2xl)' }}>
        <TickerTape symbols={holdingSymbols} />
      </div>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--sp-3xl)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--display-md)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 'var(--sp-xs)' }}>
            The Sovereign Vault
          </h1>
          <p style={{ fontSize: 'var(--body-md)', opacity: 0.6 }}>Portfolio Performance & Institutional Insights</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 'var(--label-md)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)' }}>
            Archival Tag: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div style={{ fontSize: 'var(--label-md)', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Verified Session: Active
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid" style={{ marginBottom: 'var(--sp-3xl)' }}>
        <div className="stat-card">
          <div className="stat-label">Liquidity Base</div>
          <div className="stat-value">{formatCurrency(summary.totalInvestment)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Market Valuation</div>
          <div className="stat-value">{formatCurrency(summary.totalCurrent)}</div>
        </div>
        <div className="stat-card" style={{ background: summary.dayPnl >= 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(244, 63, 94, 0.05)' }}>
          <div className="stat-label">Day's Net Flow</div>
          <div className={`stat-value ${summary.dayPnl >= 0 ? 'profit' : 'loss'}`}>
            {summary.dayPnl >= 0 ? '+' : ''}{formatCurrency(summary.dayPnl)}
          </div>
          <div className={`stat-change ${summary.dayPnl >= 0 ? 'text-profit' : 'text-loss'}`} style={{ fontWeight: 800 }}>
            {summary.dayPnl >= 0 ? '▲' : '▼'} {Math.abs(summary.dayPnl / summary.totalCurrent * 100).toFixed(2)}%
          </div>
        </div>
        <div className="stat-card" style={{ border: 'none', background: 'var(--surface-container-high)' }}>
          <div className="stat-label">Vault Appreciation</div>
          <div className={`stat-value ${summary.overallPnl >= 0 ? 'profit' : 'loss'}`}>
            {summary.overallPnl >= 0 ? '+' : ''}{formatCurrency(summary.overallPnl)}
          </div>
          <div className={`stat-change ${summary.overallPnl >= 0 ? 'text-profit' : 'text-loss'}`} style={{ fontWeight: 800 }}>
            {summary.overallPnl >= 0 ? '▲' : '▼'} {Math.abs(summary.overallPnlPercent).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Derivatives Cockpit Section */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        <OptionChainDashboard symbol="NIFTY" />
      </div>

      {/* TradingView Market Overview + Equity Curve */}
      <div className="grid-2" style={{ marginBottom: 'var(--sp-lg)' }}>
        {/* Market Overview Widget */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: 'var(--sp-md) var(--sp-lg)', marginBottom: 0 }}>
            <span className="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              Market Overview
            </span>
            <span className="badge badge-active">
              <span className="pulse-dot green" style={{ marginRight: '6px' }}></span>
              Live
            </span>
          </div>
          <div style={{ height: '420px' }}>
            <MarketOverview />
          </div>
        </div>

        {/* Equity Curve */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg>
              Portfolio Performance
            </span>
            <div className="tabs" style={{ marginBottom: 0 }}>
              {['1W', '1M', '3M', '1Y'].map(range => (
                <button
                  key={range}
                  className={`tab ${timeRange === range ? 'active' : ''}`}
                  onClick={() => setTimeRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-container">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>

          {/* Sector Allocation — nested below */}
          <div style={{ marginTop: 'var(--sp-lg)', borderTop: '1px solid var(--c-border)', paddingTop: 'var(--sp-lg)' }}>
            <div className="card-header" style={{ marginBottom: 'var(--sp-sm)' }}>
              <span className="card-title" style={{ fontSize: 'var(--fs-base)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 12V2"/><path d="M12 12h10"/></svg>
                Sector Allocation
              </span>
            </div>
            <div style={{ height: '200px' }}>
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Open Positions Table */}
      <div className="card" style={{ background: 'var(--surface-container-low)', padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: 'var(--sp-2xl)', marginBottom: 0, borderBottom: '1px solid var(--outline-variant)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--headline-md)', fontWeight: 800, letterSpacing: '-0.02em' }}>Vault Holdings</h3>
            <p style={{ fontSize: 'var(--body-md)', opacity: 0.5, marginTop: '4px' }}>Authenticated Portfolio Assets</p>
          </div>
          <div className="vault-insight-chip" style={{ 
            background: 'var(--tertiary-container)', 
            padding: '6px 16px', 
            borderRadius: 'var(--r-full)', 
            fontSize: 'var(--label-md)', 
            fontWeight: 800, 
            color: 'var(--primary)',
            letterSpacing: '0.05em'
          }}>
            LOCKED • {positions.length} ASSETS
          </div>
        </div>
        <div className="table-container">
          <table id="positions-table" style={{ borderCollapse: 'collapse' }}>
            <thead>
                <tr>
                  <th>Origin</th>
                  <th>Asset Class</th>
                  <th>Quantity</th>
                  <th>Entry Basis</th>
                  <th>Market Price</th>
                   <th>Principal</th>
                  <th>Valuation</th>
                  <th>Net P&L</th>
                  <th>Return</th>
                  <th>Actions</th>
                </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const investment = pos.avgPrice * pos.qty;
                const currentVal = pos.currentPrice * pos.qty;
                const pnl = currentVal - investment;
                const pnlPercent = (pnl / investment) * 100;

                return (
                  <tr key={`${pos.broker}-${pos.symbol}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                    <td>
                       <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--primary)', opacity: 0.6 }}>
                        {pos.broker}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, fontSize: 'var(--body-md)', letterSpacing: '-0.01em' }}>{pos.symbol}</div>
                      <div style={{ fontSize: '10px', opacity: 0.5, textTransform: 'uppercase' }}>EQUITY • NSE</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{pos.qty}</td>
                    <td style={{ opacity: 0.8 }}>₹{pos.avgPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ fontWeight: 800 }}>₹{pos.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ opacity: 0.8 }}>₹{investment.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td style={{ fontWeight: 800 }}>₹{currentVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className={pnl >= 0 ? 'text-profit' : 'text-loss'} style={{ fontWeight: 800 }}>
                      {pnl >= 0 ? '+' : ''}₹{pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                     <td>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        background: pnl >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                        color: pnl >= 0 ? 'var(--success)' : 'var(--error)',
                        fontSize: '11px',
                        fontWeight: 800
                      }}>
                        {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => setSelectedStock({ symbol: pos.symbol, price: pos.currentPrice })}
                        className="btn-primary"
                        style={{ padding: '8px', borderRadius: 'var(--r-md)', minWidth: '36px' }}
                        title="Initiate Transaction"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trade Modal */}
      <AnimatePresence>
        {selectedStock && (
          <OrderEntry 
            symbol={selectedStock.symbol} 
            currentPrice={selectedStock.price} 
            onClose={() => setSelectedStock(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
