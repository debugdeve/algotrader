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
import InstitutionalDashboard from '../components/trading/InstitutionalDashboard';
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
            { s: 'NSE:CNXFINANCE', d: 'Nifty Financial' },
            { s: 'NSE:CNXIT', d: 'Nifty IT' },
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
    <div className="animate-fadeIn">
      {/* Ticker Tape — Live prices of holdings */}
      <TickerTape symbols={holdingSymbols} />

      <div className="page-header">
        <h2>Portfolio Dashboard</h2>
        <p>Real-time overview of your trading portfolio</p>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Investment</div>
          <div className="stat-value">{formatCurrency(summary.totalInvestment)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Current Value</div>
          <div className="stat-value">{formatCurrency(summary.totalCurrent)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Day's P&L</div>
          <div className={`stat-value ${summary.dayPnl >= 0 ? 'profit' : 'loss'}`}>
            {summary.dayPnl >= 0 ? '+' : ''}{formatCurrency(summary.dayPnl)}
          </div>
          <div className={`stat-change ${summary.dayPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
            {summary.dayPnl >= 0 ? '▲' : '▼'} {Math.abs(summary.dayPnl / summary.totalCurrent * 100).toFixed(2)}%
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Overall P&L</div>
          <div className={`stat-value ${summary.overallPnl >= 0 ? 'profit' : 'loss'}`}>
            {summary.overallPnl >= 0 ? '+' : ''}{formatCurrency(summary.overallPnl)}
          </div>
          <div className={`stat-change ${summary.overallPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
            {summary.overallPnl >= 0 ? '▲' : '▼'} {Math.abs(summary.overallPnlPercent).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Institutional & Derivatives Cockpit Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <InstitutionalDashboard />
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
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
            Open Positions
          </span>
          <span className="badge badge-active">{positions.length} Stocks</span>
        </div>
        <div className="table-container">
          <table id="positions-table">
            <thead>
                <tr>
                  <th>Broker</th>
                  <th>Symbol</th>
                  <th>Qty</th>
                  <th>Avg Price</th>
                  <th>CMP</th>
                   <th>Investment</th>
                  <th>Current Value</th>
                  <th>P&L</th>
                  <th>P&L %</th>
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
                  <tr key={`${pos.broker}-${pos.symbol}`}>
                    <td>
                       <span className="badge" style={{ background: pos.broker === 'ZERODHA' ? 'rgba(64, 196, 255, 0.1)' : 'rgba(255, 128, 0, 0.1)', color: pos.broker === 'ZERODHA' ? 'var(--c-cyan)' : '#FF8000' }}>
                        {pos.broker === 'ZERODHA' ? 'Kite' : 'Breeze'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--c-text-primary)' }}>{pos.symbol}</td>
                    <td>{pos.qty}</td>
                    <td>₹{pos.avgPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td>₹{pos.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td>₹{investment.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td>₹{currentVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className={pnl >= 0 ? 'text-profit' : 'text-loss'} style={{ fontWeight: 600 }}>
                      {pnl >= 0 ? '+' : ''}₹{pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                     <td>
                      <span className={`badge ${pnl >= 0 ? 'badge-buy' : 'badge-sell'}`}>
                        {pnl >= 0 ? '▲' : '▼'} {Math.abs(pnlPercent).toFixed(2)}%
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => setSelectedStock({ symbol: pos.symbol, price: pos.currentPrice })}
                        className="p-2 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-lg transition-all"
                        title="Quick Trade"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
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
