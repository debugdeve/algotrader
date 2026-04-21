import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { NSE_STOCKS, getStockHistory } from '../data/mockData';
import axios from 'axios';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const defaultStrategy = {
  useRSI: true,
  rsiBuyThreshold: 35,
  rsiSellThreshold: 65,
  rsiPeriod: 14,
  useMACD: true,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  useStochRSI: false,
  stochBuyThreshold: 25,
  stochSellThreshold: 75,
  stochRsiPeriod: 14,
  useEMA: true,
  emaPeriod: 20,
  stopLoss: true,
  stopLossPercent: 3,
  takeProfit: true,
  takeProfitPercent: 5,
};

export default function BacktestPage() {
  const [selectedStock, setSelectedStock] = useState('RELIANCE');
  const [strategy, setStrategy] = useState(defaultStrategy);
  const [initialCapital, setInitialCapital] = useState(100000);
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [activeView, setActiveView] = useState('metrics');

  const handleRunBacktest = async () => {
    setRunning(true);
    try {
      const response = await axios.post('http://localhost:8000/api/backtest', {
        symbol: selectedStock,
        logic: `RSI < ${strategy.rsiBuyThreshold} AND Price > EMA200`, // Simplified for now
        period: "5y"
      });
      
      const apiResults = response.data;
      
      // Transform API results to match the UI expectations
      setResults({
        metrics: {
          totalReturn: apiResults.total_return,
          winRate: apiResults.win_rate,
          sharpeRatio: 1.85, // Mocked for now
          maxDrawdown: Math.abs(apiResults.max_drawdown),
          initialCapital: initialCapital,
          finalEquity: initialCapital * (1 + apiResults.total_return / 100),
          totalTrades: apiResults.trades.length,
          wins: Math.round(apiResults.trades.length * (apiResults.win_rate / 100)),
          losses: apiResults.trades.length - Math.round(apiResults.trades.length * (apiResults.win_rate / 100))
        },
        equityCurve: apiResults.trades.map(t => ({
          date: t.date.split('T')[0],
          equity: initialCapital * (1 + (apiResults.total_return * (apiResults.trades.indexOf(t) / apiResults.trades.length)) / 100), // Approximate curve
          price: t.price
        })),
        trades: apiResults.trades.map(t => ({
          ...t,
          value: t.price * (initialCapital / t.price), // Approximate
          pnl: t.type === 'SELL' ? (t.price * 0.05) : undefined // Approximate
        }))
      });
      setActiveView('metrics');
    } catch (error) {
      console.error("Backtest failed:", error);
    } finally {
      setRunning(false);
    }
  };

  const updateStrategy = (key, value) => {
    setStrategy(prev => ({ ...prev, [key]: value }));
  };

  const equityChartData = useMemo(() => {
    if (!results) return null;
    const curve = results.equityCurve;
    const step = Math.max(1, Math.floor(curve.length / 100));
    const sampled = curve.filter((_, i) => i % step === 0 || i === curve.length - 1);

    return {
      labels: sampled.map(d => d.date),
      datasets: [
        {
          label: 'Equity',
          data: sampled.map(d => d.equity),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
        },
        {
          label: 'Stock Price',
          data: sampled.map(d => d.price),
          borderColor: '#22d3ee',
          backgroundColor: 'transparent',
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 1.5,
          borderDash: [5, 5],
          yAxisID: 'y1',
        },
      ],
    };
  }, [results]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { size: 11 }, usePointStyle: true },
      },
      tooltip: {
        backgroundColor: '#1a2235',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(148, 163, 184, 0.1)',
        borderWidth: 1,
        padding: 12,
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
          callback: (v) => `₹${(v / 1000).toFixed(0)}K`,
        },
        border: { display: false },
      },
      y1: {
        position: 'right',
        grid: { display: false },
        ticks: {
          color: '#22d3ee',
          font: { size: 10 },
          callback: (v) => `₹${v.toFixed(0)}`,
        },
        border: { display: false },
      },
    },
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h2>Backtesting Module</h2>
        <p>Test your trading strategies on historical NSE data</p>
      </div>

      <div className="grid-2" style={{ marginBottom: 'var(--sp-lg)', gridTemplateColumns: '380px 1fr' }}>
        {/* Strategy Builder */}
        <div className="card" style={{ maxHeight: '700px', overflowY: 'auto' }}>
          <div className="card-header">
            <span className="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              Strategy Builder
            </span>
          </div>

          {/* Stock Selection */}
          <div className="form-group">
            <label className="form-label">Stock</label>
            <select className="form-select" value={selectedStock} onChange={(e) => setSelectedStock(e.target.value)} id="backtest-stock">
              {NSE_STOCKS.map(s => (
                <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Initial Capital (₹)</label>
            <input className="form-input" type="number" value={initialCapital} onChange={(e) => setInitialCapital(parseInt(e.target.value) || 0)} id="initial-capital" />
          </div>

          {/* RSI */}
          <div style={{ padding: 'var(--sp-sm) var(--sp-md)', background: 'var(--c-bg-tertiary)', borderRadius: 'var(--r-md)', marginBottom: 'var(--sp-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>RSI</span>
              <label className="toggle-switch" style={{ width: '40px', height: '22px' }}>
                <input type="checkbox" checked={strategy.useRSI} onChange={(e) => updateStrategy('useRSI', e.target.checked)} />
                <span className="toggle-slider" style={{'--toggle-size': '16px'}}></span>
              </label>
            </div>
            {strategy.useRSI && (
              <div className="form-row" style={{ gap: '8px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '10px' }}>Buy Below</label>
                  <input className="form-input" type="number" value={strategy.rsiBuyThreshold} onChange={(e) => updateStrategy('rsiBuyThreshold', parseInt(e.target.value))} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '10px' }}>Sell Above</label>
                  <input className="form-input" type="number" value={strategy.rsiSellThreshold} onChange={(e) => updateStrategy('rsiSellThreshold', parseInt(e.target.value))} />
                </div>
              </div>
            )}
          </div>

          {/* MACD */}
          <div style={{ padding: 'var(--sp-sm) var(--sp-md)', background: 'var(--c-bg-tertiary)', borderRadius: 'var(--r-md)', marginBottom: 'var(--sp-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>MACD</span>
              <label className="toggle-switch" style={{ width: '40px', height: '22px' }}>
                <input type="checkbox" checked={strategy.useMACD} onChange={(e) => updateStrategy('useMACD', e.target.checked)} />
                <span className="toggle-slider"></span>
              </label>
            </div>
            {strategy.useMACD && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '10px' }}>Fast</label>
                  <input className="form-input" type="number" value={strategy.macdFast} onChange={(e) => updateStrategy('macdFast', parseInt(e.target.value))} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '10px' }}>Slow</label>
                  <input className="form-input" type="number" value={strategy.macdSlow} onChange={(e) => updateStrategy('macdSlow', parseInt(e.target.value))} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '10px' }}>Signal</label>
                  <input className="form-input" type="number" value={strategy.macdSignal} onChange={(e) => updateStrategy('macdSignal', parseInt(e.target.value))} />
                </div>
              </div>
            )}
          </div>

          {/* Stochastic RSI */}
          <div style={{ padding: 'var(--sp-sm) var(--sp-md)', background: 'var(--c-bg-tertiary)', borderRadius: 'var(--r-md)', marginBottom: 'var(--sp-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>Stochastic RSI</span>
              <label className="toggle-switch" style={{ width: '40px', height: '22px' }}>
                <input type="checkbox" checked={strategy.useStochRSI} onChange={(e) => updateStrategy('useStochRSI', e.target.checked)} />
                <span className="toggle-slider"></span>
              </label>
            </div>
            {strategy.useStochRSI && (
              <div className="form-row" style={{ gap: '8px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '10px' }}>Buy Below</label>
                  <input className="form-input" type="number" value={strategy.stochBuyThreshold} onChange={(e) => updateStrategy('stochBuyThreshold', parseInt(e.target.value))} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '10px' }}>Sell Above</label>
                  <input className="form-input" type="number" value={strategy.stochSellThreshold} onChange={(e) => updateStrategy('stochSellThreshold', parseInt(e.target.value))} />
                </div>
              </div>
            )}
          </div>

          {/* EMA */}
          <div style={{ padding: 'var(--sp-sm) var(--sp-md)', background: 'var(--c-bg-tertiary)', borderRadius: 'var(--r-md)', marginBottom: 'var(--sp-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>EMA</span>
              <label className="toggle-switch" style={{ width: '40px', height: '22px' }}>
                <input type="checkbox" checked={strategy.useEMA} onChange={(e) => updateStrategy('useEMA', e.target.checked)} />
                <span className="toggle-slider"></span>
              </label>
            </div>
            {strategy.useEMA && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '10px' }}>Period</label>
                <input className="form-input" type="number" value={strategy.emaPeriod} onChange={(e) => updateStrategy('emaPeriod', parseInt(e.target.value))} />
              </div>
            )}
          </div>

          {/* Risk Management */}
          <div style={{ padding: 'var(--sp-sm) var(--sp-md)', background: 'var(--c-bg-tertiary)', borderRadius: 'var(--r-md)', marginBottom: 'var(--sp-md)' }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', marginBottom: '8px' }}>Risk Management</div>
            <div className="form-row" style={{ gap: '8px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--c-text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={strategy.stopLoss} onChange={(e) => updateStrategy('stopLoss', e.target.checked)} />
                  Stop Loss %
                </label>
                {strategy.stopLoss && (
                  <input className="form-input" type="number" value={strategy.stopLossPercent} onChange={(e) => updateStrategy('stopLossPercent', parseFloat(e.target.value))} style={{ marginTop: '4px' }} />
                )}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--c-text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={strategy.takeProfit} onChange={(e) => updateStrategy('takeProfit', e.target.checked)} />
                  Take Profit %
                </label>
                {strategy.takeProfit && (
                  <input className="form-input" type="number" value={strategy.takeProfitPercent} onChange={(e) => updateStrategy('takeProfitPercent', parseFloat(e.target.value))} style={{ marginTop: '4px' }} />
                )}
              </div>
            </div>
          </div>

          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleRunBacktest} disabled={running} id="run-backtest-btn">
            {running ? '⏳ Running Backtest...' : '🚀 Run Backtest'}
          </button>
        </div>

        {/* Results Panel */}
        <div>
          {!results && !running && (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '48px', opacity: 0.5 }}>📊</div>
              <p style={{ color: 'var(--c-text-muted)', textAlign: 'center' }}>
                Configure your strategy and click<br />"Run Backtest" to see results
              </p>
            </div>
          )}

          {running && (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', flexDirection: 'column', gap: '16px' }}>
              <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }}></div>
              <p style={{ color: 'var(--c-text-muted)' }}>Running strategy simulation...</p>
            </div>
          )}

          {results && !running && (
            <div>
              {/* Metrics Grid */}
              <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 'var(--sp-md)' }}>
                <div className="stat-card">
                  <div className="stat-label">Total Return</div>
                  <div className={`stat-value ${results.metrics.totalReturn >= 0 ? 'profit' : 'loss'}`}>
                    {results.metrics.totalReturn >= 0 ? '+' : ''}{results.metrics.totalReturn}%
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Win Rate</div>
                  <div className={`stat-value ${results.metrics.winRate >= 50 ? 'profit' : 'loss'}`}>
                    {results.metrics.winRate}%
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Sharpe Ratio</div>
                  <div className={`stat-value ${results.metrics.sharpeRatio >= 1 ? 'profit' : results.metrics.sharpeRatio >= 0 ? '' : 'loss'}`}>
                    {results.metrics.sharpeRatio}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Max Drawdown</div>
                  <div className="stat-value loss">-{results.metrics.maxDrawdown}%</div>
                </div>
              </div>

              <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 'var(--sp-md)' }}>
                <div className="stat-card">
                  <div className="stat-label">Initial Capital</div>
                  <div className="stat-value" style={{ fontSize: 'var(--fs-lg)' }}>₹{results.metrics.initialCapital.toLocaleString('en-IN')}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Final Equity</div>
                  <div className="stat-value" style={{ fontSize: 'var(--fs-lg)' }}>₹{results.metrics.finalEquity.toLocaleString('en-IN')}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Trades</div>
                  <div className="stat-value" style={{ fontSize: 'var(--fs-lg)' }}>{results.metrics.totalTrades}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">W / L</div>
                  <div className="stat-value" style={{ fontSize: 'var(--fs-lg)' }}>
                    <span className="text-profit">{results.metrics.wins}</span>
                    {' / '}
                    <span className="text-loss">{results.metrics.losses}</span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="tabs" style={{ marginBottom: 'var(--sp-md)' }}>
                <button className={`tab ${activeView === 'metrics' ? 'active' : ''}`} onClick={() => setActiveView('metrics')}>Equity Curve</button>
                <button className={`tab ${activeView === 'trades' ? 'active' : ''}`} onClick={() => setActiveView('trades')}>Trade Log</button>
              </div>

              {activeView === 'metrics' && equityChartData && (
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Equity Curve vs Stock Price</span>
                  </div>
                  <div className="chart-container" style={{ height: '350px' }}>
                    <Line data={equityChartData} options={chartOptions} />
                  </div>
                </div>
              )}

              {activeView === 'trades' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table id="backtest-trades-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Type</th>
                          <th>Date</th>
                          <th>Price</th>
                          <th>Qty</th>
                          <th>Value</th>
                          <th>P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.trades.map((trade, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td>
                              <span className={`badge ${trade.type === 'BUY' ? 'badge-buy' : 'badge-sell'}`}>
                                {trade.type}
                              </span>
                            </td>
                            <td>{trade.date}</td>
                            <td>₹{trade.price.toFixed(2)}</td>
                            <td>{trade.qty}</td>
                            <td>₹{trade.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                            <td className={trade.pnl ? (trade.pnl >= 0 ? 'text-profit' : 'text-loss') : ''} style={{ fontWeight: 600 }}>
                              {trade.pnl !== undefined ? `${trade.pnl >= 0 ? '+' : ''}₹${trade.pnl.toLocaleString('en-IN')}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
