import { useState, useEffect } from 'react';
import { NSE_STOCKS, MOCK_ORDERS } from '../data/mockData';
import kiteApi from '../services/kiteApi';
import breezeApi from '../services/breezeApi';

export default function TradePage() {
  const [kiteConfig, setKiteConfig] = useState({ 
    apiKey: localStorage.getItem('kite_api_key') || '', 
    accessToken: '' 
  });
  const [breezeConfig, setBreezeConfig] = useState({
    apiKey: localStorage.getItem('breeze_api_key') || '',
    apiSecret: localStorage.getItem('breeze_api_secret') || '',
    sessionToken: ''
  });
  
  const [kiteConnected, setKiteConnected] = useState(kiteApi.isConnected);
  const [breezeConnected, setBreezeConnected] = useState(false); // Add real connection check if possible
  const [connecting, setConnecting] = useState(false);
  const [autoTradeEnabled, setAutoTradeEnabled] = useState(false);
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [orderForm, setOrderForm] = useState({
    symbol: 'RELIANCE',
    action: 'BUY',
    quantity: '',
    price: '',
    orderType: 'MARKET',
    productType: 'MIS',
    exchange: 'NSE',
    validity: 'DAY',
    broker: 'ZERODHA', // Default
  });
  const [placingOrder, setPlacingOrder] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('orders');

  // Check for redirect request_token on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const kiteToken = urlParams.get('request_token');
    const breezeToken = urlParams.get('apisession'); // Breeze usually uses apisession
    
    // Kite Redirect Handling
    if (kiteToken && kiteConfig.apiKey) {
      const connectKite = async () => {
        setConnecting(true);
        setStatusMessage({ type: 'success', text: 'Generating Kite session...' });
        try {
          kiteApi.configure(kiteConfig.apiKey, 'MOCK_SECRET', '');
          const result = await kiteApi.connect(kiteToken);
          setKiteConnected(true);
          setStatusMessage({ type: 'success', text: `Kite Connected — User: ${result.user.user_name}` });
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          setStatusMessage({ type: 'error', text: `Kite Error: ${err.message}` });
        } finally {
          setConnecting(false);
        }
      };
      connectKite();
    }

    // Breeze Redirect Handling
    if (breezeToken && breezeConfig.apiKey && breezeConfig.apiSecret) {
      const connectBreeze = async () => {
        setConnecting(true);
        setStatusMessage({ type: 'success', text: 'Generating Breeze session...' });
        try {
          const result = await breezeApi.generateSession(breezeConfig.apiKey, breezeConfig.apiSecret, breezeToken);
          if (result.status === 'success') {
            setBreezeConnected(true);
            setStatusMessage({ type: 'success', text: `Breeze Connected — User: ${result.user.user_name}` });
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
             throw new Error(result.message || 'Breeze Session Failed');
          }
        } catch (err) {
          setStatusMessage({ type: 'error', text: `Breeze Error: ${err.message}` });
        } finally {
          setConnecting(false);
        }
      };
      connectBreeze();
    }
  }, []);

  const handleKiteConnect = async () => {
    if (!kiteConfig.apiKey) {
      setStatusMessage({ type: 'error', text: 'Please enter your Kite API Key' });
      return;
    }
    localStorage.setItem('kite_api_key', kiteConfig.apiKey);

    if (!kiteConfig.accessToken) {
       setStatusMessage({ type: 'error', text: 'Please complete the Kite Login flow first.' });
       return;
    }

    setConnecting(true);
    try {
      kiteApi.configure(kiteConfig.apiKey, 'MOCK_SECRET', kiteConfig.accessToken);
      const result = await kiteApi.connect();
      setKiteConnected(true);
      setStatusMessage({ type: 'success', text: `Kite Connected — User: ${result.user.user_name}` });
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setConnecting(false);
    }
  };

  const handleBreezeConnect = async () => {
    if (!breezeConfig.apiKey || !breezeConfig.apiSecret) {
      setStatusMessage({ type: 'error', text: 'Please enter Breeze API Key and Secret' });
      return;
    }
    localStorage.setItem('breeze_api_key', breezeConfig.apiKey);
    localStorage.setItem('breeze_api_secret', breezeConfig.apiSecret);

    if (!breezeConfig.sessionToken) {
       setStatusMessage({ type: 'error', text: 'Please complete the Breeze Login flow first.' });
       return;
    }

    setConnecting(true);
    try {
      const result = await breezeApi.generateSession(breezeConfig.apiKey, breezeConfig.apiSecret, breezeConfig.sessionToken);
      if (result.status === 'success') {
        setBreezeConnected(true);
        setStatusMessage({ type: 'success', text: `Breeze Connected — User: ${result.user.user_name}` });
      } else {
        throw new Error(result.detail || 'Breeze Connection Error');
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = (broker) => {
    if (broker === 'ZERODHA') {
        kiteApi.disconnect();
        setKiteConnected(false);
        setStatusMessage({ type: 'success', text: 'Disconnected from Kite API' });
    } else {
        setBreezeConnected(false);
        setStatusMessage({ type: 'success', text: 'Disconnected from Breeze API' });
    }
  };

  const handlePlaceOrder = async () => {
    if (!orderForm.quantity || (orderForm.orderType === 'LIMIT' && !orderForm.price)) {
      setStatusMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }
    
    const isKite = orderForm.broker === 'ZERODHA';
    if (isKite && !kiteConnected) { setStatusMessage({ type: 'error', text: 'Kite Broker not connected' }); return; }
    if (!isKite && !breezeConnected) { setStatusMessage({ type: 'error', text: 'Breeze Broker not connected' }); return; }

    setPlacingOrder(true);
    try {
      const api = isKite ? kiteApi : breezeApi;
      const result = await api.placeOrder({
        tradingsymbol: orderForm.symbol,
        exchange: orderForm.exchange,
        transaction_type: orderForm.action,
        quantity: parseInt(orderForm.quantity),
        price: parseFloat(orderForm.price) || 0,
        order_type: orderForm.orderType,
        product: orderForm.productType,
        validity: orderForm.validity,
        broker: orderForm.broker
      });
      setOrders(prev => [result.order, ...prev]);
      setStatusMessage({ type: 'success', text: `Order ${result.data.order_id} placed on ${orderForm.broker}` });
      setOrderForm(f => ({ ...f, quantity: '', price: '' }));
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleCancelOrder = async (orderId, broker) => {
    try {
      if (broker === 'ZERODHA') {
          await kiteApi.cancelOrder(orderId);
      } else {
          // Implement breeze cancel if needed
      }
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o));
      setStatusMessage({ type: 'success', text: `Order ${orderId} cancelled` });
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const openBrokerLogin = async (broker) => {
    if (broker === 'ZERODHA') {
      if (!kiteConfig.apiKey) { setStatusMessage({ type: 'error', text: 'Enter Kite API Key first' }); return; }
      localStorage.setItem('kite_api_key', kiteConfig.apiKey);
      try {
        const url = await kiteApi.getLoginURL();
        window.location.href = url;
      } catch (err) { setStatusMessage({ type: 'error', text: 'Failed kite login' }); }
    } else {
      if (!breezeConfig.apiKey) { setStatusMessage({ type: 'error', text: 'Enter Breeze API Key first' }); return; }
      localStorage.setItem('breeze_api_key', breezeConfig.apiKey);
      try {
        const res = await breezeApi.getLoginUrl(breezeConfig.apiKey);
        window.location.href = res.login_url;
      } catch (err) { setStatusMessage({ type: 'error', text: 'Failed breeze login' }); }
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h2>Auto Trade Execution</h2>
        <p>Connect to Zerodha Kite and ICICI Breeze for automated trading</p>
      </div>

      {statusMessage && (
        <div className={statusMessage.type === 'error' ? 'error-message' : 'success-message'} style={{ marginBottom: 'var(--sp-md)' }}>
          {statusMessage.text}
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: 'var(--sp-lg)' }}>
        {/* Kite Card */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Zerodha Kite</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`pulse-dot ${kiteConnected ? 'green' : 'red'}`}></span>
              <span style={{ fontSize: 'var(--fs-xs)', color: kiteConnected ? 'var(--c-profit)' : 'var(--c-loss)' }}>
                {kiteConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">API Key</label>
            <input
              className="form-input"
              type="text"
              value={kiteConfig.apiKey}
              onChange={(e) => setKiteConfig(c => ({ ...c, apiKey: e.target.value }))}
              disabled={kiteConnected}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--sp-xs)' }}>
             <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openBrokerLogin('ZERODHA')} disabled={kiteConnected || !kiteConfig.apiKey}>🔑 Login</button>
             {!kiteConnected ? (
               <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleKiteConnect} disabled={connecting}>🔌 Connect</button>
             ) : (
               <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => handleDisconnect('ZERODHA')}>Disconnect</button>
             )}
          </div>
          <div style={{ marginTop: '12px', fontSize: '10px', color: 'var(--c-text-muted)' }}>
            Session generated via official redirect flow.
          </div>
        </div>

        {/* Breeze Card */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">ICICI Breeze</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`pulse-dot ${breezeConnected ? 'green' : 'red'}`}></span>
              <span style={{ fontSize: 'var(--fs-xs)', color: breezeConnected ? 'var(--c-profit)' : 'var(--c-loss)' }}>
                {breezeConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">API Key</label>
              <input className="form-input" type="text" value={breezeConfig.apiKey} onChange={(e) => setBreezeConfig(c => ({ ...c, apiKey: e.target.value }))} disabled={breezeConnected} />
            </div>
            <div className="form-group">
              <label className="form-label">API Secret</label>
              <input className="form-input" type="password" value={breezeConfig.apiSecret} onChange={(e) => setBreezeConfig(c => ({ ...c, apiSecret: e.target.value }))} disabled={breezeConnected} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--sp-xs)' }}>
             <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openBrokerLogin('BREEZE')} disabled={breezeConnected || !breezeConfig.apiKey}>🔑 Login</button>
             {!breezeConnected ? (
               <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleBreezeConnect} disabled={connecting}>🔌 Connect</button>
             ) : (
               <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => handleDisconnect('BREEZE')}>Disconnect</button>
             )}
          </div>
           <div style={{ marginTop: '12px', fontSize: '10px', color: 'var(--c-text-muted)' }}>
            Paste the 'apisession' token from the redirect URL if not auto-filled.
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 'var(--sp-lg)' }}>
        {/* Order Card */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Place Order</span>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Broker</label>
              <select
                className="form-select"
                value={orderForm.broker}
                onChange={(e) => setOrderForm(f => ({ ...f, broker: e.target.value }))}
              >
                <option value="ZERODHA">Zerodha Kite</option>
                <option value="ICICI_BREEZE">ICICI Breeze</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Stock</label>
              <select
                className="form-select"
                value={orderForm.symbol}
                onChange={(e) => setOrderForm(f => ({ ...f, symbol: e.target.value }))}
              >
                {NSE_STOCKS.map(s => (
                  <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Action</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`btn ${orderForm.action === 'BUY' ? 'btn-success' : 'btn-secondary'}`}
                  onClick={() => setOrderForm(f => ({ ...f, action: 'BUY' }))}
                  style={{ flex: 1 }}
                >
                  BUY
                </button>
                <button
                  className={`btn ${orderForm.action === 'SELL' ? 'btn-danger' : 'btn-secondary'}`}
                  onClick={() => setOrderForm(f => ({ ...f, action: 'SELL' }))}
                  style={{ flex: 1 }}
                >
                  SELL
                </button>
              </div>
            </div>
            <div className="form-group">
               <label className="form-label">Product</label>
               <select
                 className="form-select"
                 value={orderForm.productType}
                 onChange={(e) => setOrderForm(f => ({ ...f, productType: e.target.value }))}
               >
                 <option value="MIS">MIS (Intraday)</option>
                 <option value="CNC">CNC (Delivery)</option>
                 <option value="NRML">NRML (F&O Normal)</option>
               </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input
                className="form-input"
                type="number"
                value={orderForm.quantity}
                onChange={(e) => setOrderForm(f => ({ ...f, quantity: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Price</label>
              <input
                className="form-input"
                type="number"
                disabled={orderForm.orderType === 'MARKET'}
                value={orderForm.price}
                onChange={(e) => setOrderForm(f => ({ ...f, price: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-row">
             <div className="form-group">
              <label className="form-label">Order Type</label>
              <select
                className="form-select"
                value={orderForm.orderType}
                onChange={(e) => setOrderForm(f => ({ ...f, orderType: e.target.value }))}
              >
                <option value="MARKET">Market</option>
                <option value="LIMIT">Limit</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Exchange</label>
              <select
                className="form-select"
                value={orderForm.exchange}
                onChange={(e) => setOrderForm(f => ({ ...f, exchange: e.target.value }))}
              >
                <option value="NSE">NSE</option>
                <option value="BSE">BSE</option>
              </select>
            </div>
          </div>

          <button
            className={`btn ${orderForm.action === 'BUY' ? 'btn-success' : 'btn-danger'} btn-lg`}
            style={{ width: '100%', marginTop: 'var(--sp-md)' }}
            onClick={handlePlaceOrder}
            disabled={placingOrder}
          >
            {placingOrder ? 'Placing Order...' : `Place ${orderForm.action} Order`}
          </button>
        </div>

        {/* Auto Trade Toggle Card */}
        <div className="card">
           <div className="card-header">
            <span className="card-title">Auto Trading</span>
          </div>
          <div style={{ padding: 'var(--sp-md)', background: 'var(--c-bg-tertiary)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>Algorithm Status</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)' }}>Execute signals from both brokers</div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={autoTradeEnabled}
                onChange={(e) => setAutoTradeEnabled(e.target.checked)}
                disabled={!kiteConnected && !breezeConnected}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <div style={{ marginTop: 'var(--sp-md)', fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)' }}>
            When enabled, the scanner will automatically place orders on the selected default broker when a signal is detected.
          </div>
        </div>
      </div>

      {/* Order Book */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Order Book</span>
          <div className="tabs" style={{ marginBottom: 0 }}>
            {['orders', 'executed', 'pending'].map(tab => (
              <button
                key={tab}
                className={`tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'orders' ? 'All' : tab === 'executed' ? 'Complete' : 'Open'}
              </button>
            ))}
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Broker</th>
                <th>Symbol</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Status</th>
                <th>Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders
                .filter(o => {
                  if (activeTab === 'executed') return o.status === 'EXECUTED' || o.status === 'COMPLETE';
                  if (activeTab === 'pending') return o.status === 'PENDING' || o.status === 'OPEN';
                  return true;
                })
                .map(order => (
                  <tr key={order.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{order.id}</td>
                    <td>
                       <span className="badge" style={{ background: order.broker === 'ZERODHA' ? 'rgba(64, 196, 255, 0.1)' : 'rgba(255, 128, 0, 0.1)', color: order.broker === 'ZERODHA' ? 'var(--c-cyan)' : '#FF8000' }}>
                        {order.broker === 'ZERODHA' ? 'Kite' : 'Breeze'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{order.symbol}</td>
                    <td><span className={`badge ${order.type === 'BUY' ? 'badge-buy' : 'badge-sell'}`}>{order.type}</span></td>
                    <td>{order.qty}</td>
                    <td>{typeof order.price === 'number' ? `₹${order.price}` : order.price}</td>
                    <td>
                      <span className={`badge ${order.status === 'COMPLETE' || order.status === 'EXECUTED' ? 'badge-buy' : 'badge-active'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{order.time}</td>
                    <td>
                      {(order.status === 'OPEN' || order.status === 'PENDING') && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleCancelOrder(order.id, order.broker)}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
