import { useState, useEffect } from 'react';
import { parseMagicFilter } from '../utils/magicParser';

const INDICATORS = [
  { value: 'close', label: 'Close Price' },
  { value: 'open', label: 'Open Price' },
  { value: 'volume', label: 'Volume' },
  { value: 'sma', label: 'Simple Moving Average (SMA)' },
  { value: 'ema', label: 'Exponential Moving Average (EMA)' },
  { value: 'rsi', label: 'RSI' },
  { value: 'macd', label: 'MACD' },
];

const OPERATORS = [
  { value: '>', label: 'Greater Than' },
  { value: '<', label: 'Less Than' },
  { value: '==', label: 'Equals' },
  { value: 'crossover', label: 'Crosses Above' },
  { value: 'crossunder', label: 'Crosses Below' },
];

export default function CustomScreenerPage() {
  const [mode, setMode] = useState('logic'); // Logic builder by default for Strategy
  const [magicText, setMagicText] = useState('');
  const [aiFeedback, setAiFeedback] = useState(null);
  
  // Dual Strategy State
  const [buyEnabled, setBuyEnabled] = useState(true);
  const [buyConditions, setBuyConditions] = useState([
    { id: Date.now() + 1, leftName: 'close', leftPeriod: '', operator: '>', rightType: 'number', rightName: '', rightPeriod: '', rightValue: '100' }
  ]);
  const [buyAllocation, setBuyAllocation] = useState('10000');

  const [sellEnabled, setSellEnabled] = useState(false);
  const [sellConditions, setSellConditions] = useState([
    { id: Date.now() + 2, leftName: 'close', leftPeriod: '', operator: '<', rightType: 'number', rightName: '', rightPeriod: '', rightValue: '90' }
  ]);

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Broker Configurations
  const [broker, setBroker] = useState('ZERODHA');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  useEffect(() => {
    const savedBroker = localStorage.getItem('algo_broker') || 'ZERODHA';
    const savedKey = localStorage.getItem('algo_api_key') || '';
    const savedSecret = localStorage.getItem('algo_api_secret') || '';
    setBroker(savedBroker);
    setApiKey(savedKey);
    setApiSecret(savedSecret);
  }, []);

  const saveBrokerSettings = (b, k, s) => {
    localStorage.setItem('algo_broker', b);
    localStorage.setItem('algo_api_key', k);
    localStorage.setItem('algo_api_secret', s);
  };

  const addCondition = (type) => {
    const defaultC = { id: Date.now(), leftName: 'close', leftPeriod: '', operator: '>', rightType: 'number', rightName: 'sma', rightPeriod: '20', rightValue: '' };
    if (type === 'BUY') setBuyConditions([...buyConditions, defaultC]);
    else setSellConditions([...sellConditions, defaultC]);
  };

  const removeCondition = (type, id) => {
    if (type === 'BUY' && buyConditions.length > 1) setBuyConditions(buyConditions.filter(c => c.id !== id));
    if (type === 'SELL' && sellConditions.length > 1) setSellConditions(sellConditions.filter(c => c.id !== id));
  };

  const handleChange = (type, id, field, value) => {
    if (type === 'BUY') setBuyConditions(buyConditions.map(c => c.id === id ? { ...c, [field]: value } : c));
    if (type === 'SELL') setSellConditions(sellConditions.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleMagicGenerate = async (textToParse = magicText) => {
    if (!textToParse) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setAiFeedback(null);
    setMagicText(textToParse);

    try {
      // 1. Fetch structured logic from our Vercel AI Edge route
      const res = await fetch('/api/magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToParse })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'AI parsing failed. Check your API key.');
      }

      const data = await res.json();

      // 2. Map AI output to our Internal UI state
      const mappedConditions = data.logic.map((l, idx) => ({
        id: Date.now() + idx,
        leftName: l.left.name.toLowerCase(),
        leftPeriod: l.left.period ? String(l.left.period) : '',
        operator: l.operator,
        rightType: l.right ? 'indicator' : 'number',
        rightName: l.right ? l.right.name.toLowerCase() : '',
        rightPeriod: (l.right && l.right.period) ? String(l.right.period) : '',
        rightValue: l.right_value !== undefined ? String(l.right_value) : ''
      }));

      setBuyConditions(mappedConditions);
      setBuyEnabled(true);
      setSellEnabled(false);
      setAiFeedback({
        summary: data.researchSummary,
        tickers: data.recommendedTickers
      });

      // 3. Immediately launch the engine scan
      await executeStrategyEngine(mappedConditions, [], true, false);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Convert FE format to BE format
  const formatConds = (condArray) => condArray.map(c => {
      const cond = {
        left: { name: c.leftName, period: c.leftPeriod ? parseInt(c.leftPeriod) : null },
        operator: c.operator
      };
      if (c.rightType === 'indicator') {
        cond.right = { name: c.rightName, period: c.rightPeriod ? parseInt(c.rightPeriod) : null };
      } else {
        cond.right_value = parseFloat(c.rightValue || 0);
      }
      return cond;
  });

  const executeStrategyEngine = async (bConds = buyConditions, sConds = sellConditions, bEn = buyEnabled, sEn = sellEnabled) => {
    setLoading(true);
    setError(null);
    setResults(null);

    const payload = {
      broker: broker,
      api_key: apiKey,
      api_secret: apiSecret,
      buy_enabled: bEn,
      buy_allocation: parseFloat(buyAllocation),
      buy_conditions: formatConds(bConds),
      sell_enabled: sEn,
      sell_conditions: formatConds(sConds)
    };

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/execute-strategy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to run scan');
      
      setResults(data.matches || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // UI Builder Helper
  const renderConditionBuilder = (type, isActive, toggleActive, conditions, title, rbgColor, hexColor) => (
    <div style={{ backgroundColor: `rgba(${rbgColor}, 0.05)`, border: `2px solid rgba(${rbgColor}, ${isActive ? 0.4 : 0.1})`, padding: 'var(--sp-md)', borderRadius: 'var(--r-md)', marginBottom: '24px', opacity: isActive ? 1 : 0.6, transition: 'all 0.2s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input type="checkbox" checked={isActive} onChange={e => toggleActive(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: hexColor }} />
          <div style={{ color: hexColor, fontWeight: 'bold', fontSize: '16px' }}>▼ {title}</div>
        </div>
        
        {isActive && (
           <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
             {type === 'BUY' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px', fontSize: '13px' }}>
                  <span>Allocation per trade: ₹</span>
                  <input type="number" className="form-input" value={buyAllocation} onChange={e => setBuyAllocation(e.target.value)} style={{ width: '100px', padding: '4px 8px' }} />
                </div>
             )}
             <button className="btn btn-secondary btn-sm" onClick={() => addCondition(type)}>+ Block</button>
           </div>
        )}
      </div>

      {isActive && conditions.map((c, index) => (
        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: index !== conditions.length - 1 ? '16px' : 0 }}>
          {/* Left Operand */}
          <div style={{ display: 'flex', gap: '8px', flex: 1, backgroundColor: 'var(--c-bg-primary)', padding: '12px', borderRadius: 'var(--r-md)', border: '1px solid var(--c-border)' }}>
            <select className="form-input" style={{ flex: 2, padding: '8px', margin: 0 }} value={c.leftName} onChange={e => handleChange(type, c.id, 'leftName', e.target.value)}>
              {INDICATORS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
            {['sma', 'ema', 'rsi'].includes(c.leftName) && (
              <input type="number" className="form-input" placeholder="Period" style={{ flex: 1, padding: '8px', margin: 0 }} value={c.leftPeriod} onChange={e => handleChange(type, c.id, 'leftPeriod', e.target.value)} />
            )}
          </div>

          {/* Operator */}
          <div style={{ width: '150px' }}>
            <select className="form-input" style={{ padding: '8px', margin: 0, textAlign: 'center', fontWeight: 'bold', color: 'var(--c-accent)' }} value={c.operator} onChange={e => handleChange(type, c.id, 'operator', e.target.value)}>
              {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Right Operand */}
          <div style={{ display: 'flex', gap: '8px', flex: 1, backgroundColor: 'var(--c-bg-primary)', padding: '12px', borderRadius: 'var(--r-md)', border: '1px solid var(--c-border)' }}>
            <select className="form-input" style={{ flex: 1, padding: '8px', margin: 0 }} value={c.rightType} onChange={e => handleChange(type, c.id, 'rightType', e.target.value)}>
              <option value="indicator">Indicator</option>
              <option value="number">Number</option>
            </select>

            {c.rightType === 'indicator' ? (
              <>
                <select className="form-input" style={{ flex: 2, padding: '8px', margin: 0 }} value={c.rightName} onChange={e => handleChange(type, c.id, 'rightName', e.target.value)}>
                  {INDICATORS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
                {['sma', 'ema', 'rsi'].includes(c.rightName) && (
                  <input type="number" className="form-input" placeholder="Period" style={{ flex: 1, padding: '8px', margin: 0 }} value={c.rightPeriod} onChange={e => handleChange(type, c.id, 'rightPeriod', e.target.value)} />
                )}
              </>
            ) : (
              <input type="number" className="form-input" placeholder="Value" style={{ flex: 2, padding: '8px', margin: 0 }} value={c.rightValue} onChange={e => handleChange(type, c.id, 'rightValue', e.target.value)} />
            )}
          </div>

          <button className="btn btn-secondary btn-sm" style={{ padding: '8px', color: 'var(--c-loss)' }} onClick={() => removeCondition(type, c.id)} disabled={conditions.length === 1}>✕</button>
        </div>
      ))}
      
      {isActive && (
        <div style={{ marginTop: '16px', padding: '12px', background: `rgba(${rbgColor}, 0.1)`, borderRadius: '4px', fontWeight: 'bold', color: hexColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
          ► Then Auto-Trigger: {type} {type === 'BUY' ? 'SIGNAL (NSE Markets)' : 'SIGNAL (Your Portfolio Holdings)'}
        </div>
      )}
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <div className="page-header" style={{ marginBottom: 'var(--sp-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ marginBottom: 0 }}>Stock Scanner & Builder</h2>
            <p>Scan the market via AI or Execute algorithms on Live Data</p>
          </div>
          <div className="tabs" style={{ background: 'var(--c-bg-secondary)', border: '1px solid var(--c-border)' }}>
            <button className={`tab ${mode === 'magic' ? 'active' : ''}`} onClick={() => setMode('magic')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>✨</span> Magic Scanner
            </button>
            <button className={`tab ${mode === 'logic' ? 'active' : ''}`} onClick={() => setMode('logic')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚡</span> Strategy Block Builder
            </button>
          </div>
        </div>
      </div>

      {mode === 'magic' && (
        <div className="card" style={{ marginBottom: 'var(--sp-lg)', background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(99, 102, 241, 0.05) 100%)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--c-cyan)', fontWeight: 600 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
            MAGIC FILTERS (Scanner Only)
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Scan stocks using simple language like 'rsi oversold' or 'macd bullish crossover'" 
              style={{ flex: 1, padding: '12px 16px', fontSize: '15px' }}
              value={magicText}
              onChange={(e) => setMagicText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleMagicGenerate()}
              disabled={loading}
            />
            <button className="btn btn-primary" style={{ padding: '0 24px', background: 'var(--c-cyan)', color: '#000', fontWeight: 'bold' }} onClick={() => handleMagicGenerate()} disabled={loading}>
              {loading ? 'Scanning...' : '✨ Generate & Scan'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['RSI oversold', 'MACD bullish crossover', 'Golden cross'].map((chip) => (
              <button key={chip} className="badge" style={{ background: 'var(--c-bg-tertiary)', border: '1px solid var(--c-border)', cursor: 'pointer', padding: '6px 12px', textTransform: 'none' }} onClick={() => handleMagicGenerate(chip)} disabled={loading}>
                {chip} ↗
              </button>
            ))}
          </div>

          {aiFeedback && (
            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 'var(--r-md)', animation: 'fadeInUp 0.4s ease-out' }}>
              <div style={{ fontSize: '13px', color: 'var(--c-cyan)', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '16px' }}>📝</span> AI RESEARCH SUMMARY
              </div>
              <p style={{ fontSize: '14px', color: 'var(--c-text-primary)', lineHeight: '1.6', margin: '0 0 16px 0' }}>
                {aiFeedback.summary}
              </p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                 <span style={{ fontSize: '12px', color: 'var(--c-text-muted)' }}>Hot Tickers:</span>
                 {aiFeedback.tickers.map(t => (
                   <span key={t} className="badge" style={{ background: 'var(--c-bg-tertiary)', color: 'var(--c-text-primary)' }}>{t}</span>
                 ))}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'logic' && (
        <div className="card" style={{ marginBottom: 'var(--sp-lg)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span className="card-title" style={{ fontSize: '1.25rem' }}>Dual Strategy Automation Builder</span>
          </div>

          {/* DUAL BLOCKS UI */}
          {renderConditionBuilder('BUY', buyEnabled, setBuyEnabled, buyConditions, 'WHEN (Buy Pipeline)', '16, 185, 129', 'var(--c-profit)')}
          {renderConditionBuilder('SELL', sellEnabled, setSellEnabled, sellConditions, 'WHEN (Sell Pipeline)', '239, 68, 68', 'var(--c-loss)')}

          {/* API Settings Module */}
          <div style={{ marginTop: '16px', padding: '16px', background: 'var(--c-bg-primary)', border: '1px dashed var(--c-border)', borderRadius: 'var(--r-md)' }}>
             <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--c-text-secondary)' }}>Broker Interface Authentication (Kite / Breeze)</h4>
             <div className="grid-2">
                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>API Key</label>
                  <input type="password" placeholder="Enter API Key to run live" className="form-input" value={apiKey} onChange={e => {setApiKey(e.target.value); saveBrokerSettings(broker, e.target.value, apiSecret);}} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>API Secret</label>
                  <input type="password" placeholder="Enter API Secret" className="form-input" value={apiSecret} onChange={e => {setApiSecret(e.target.value); saveBrokerSettings(broker, apiKey, e.target.value);}} />
                </div>
             </div>
             <p style={{ fontSize: '12px', color: 'var(--c-text-muted)', marginTop: '8px' }}>Your keys are stored securely offline in 'algo_api_key' cache. The automated strategy will use them to place live trades on signals.</p>
          </div>

          <div style={{ marginTop: 'var(--sp-md)', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--c-border)', paddingTop: '24px' }}>
            <button className="btn btn-primary btn-lg" onClick={() => executeStrategyEngine()} disabled={loading || (!buyEnabled && !sellEnabled)} style={{ background: 'var(--c-accent)', fontSize: '18px', padding: '16px 32px' }}>
              {loading ? 'Executing Engine...' : '⚡ Launch Automated Trading'}
            </button>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {results && (
        <div className="card" style={{ borderTop: `4px solid ${(mode === 'magic') ? 'var(--c-cyan)' : 'var(--c-accent)'}` }}>
          <div className="card-header">
            <span className="card-title">
              {mode === 'magic' ? `Scan Results (${results.length} Stocks Matched)` : `Automated Executions Tracker (${results.length} Signals Fired)`}
            </span>
          </div>

          {results.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Execution Pipeline</th>
                    <th>Latest Price</th>
                    {mode !== 'magic' && <th>Traded Qty</th>}
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: 'var(--c-text-primary)' }}>{r.symbol}</td>
                      <td>
                         <span className="badge" style={{ background: r.trade_action === 'BUY' ? 'var(--c-profit-bg)' : (r.trade_action === 'SELL' ? 'var(--c-loss-bg)' : 'var(--c-bg-tertiary)') }}>
                            {r.trade_action || 'SCAN'}
                         </span>
                      </td>
                      <td>₹{r.price.toFixed(2)}</td>
                      {mode !== 'magic' && <td>{r.trade_qty} shares</td>}
                      <td>
                        {mode === 'magic' ? (
                           <a href={`/trade?symbol=${r.symbol}`} className="btn btn-secondary btn-sm" style={{ padding: '6px 12px', fontSize: '12px' }}>Trade Manually</a>
                        ) : (
                           <span className="badge badge-active" style={{ background: r.trade_action === 'BUY' ? 'var(--c-profit-bg)' : 'var(--c-loss-bg)', color: r.trade_action === 'BUY' ? 'var(--c-profit)' : 'var(--c-loss)', border: 'none' }}>
                             ✓ Executed on {r.broker}
                           </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 'var(--sp-xl)', textAlign: 'center', color: 'var(--c-text-muted)' }}>
              No logic matched during this execution polling cycle.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
