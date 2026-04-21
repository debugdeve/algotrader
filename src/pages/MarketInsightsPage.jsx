import React, { useEffect, useRef } from 'react';
import InstitutionalDashboard from '../components/trading/InstitutionalDashboard';

/* ── TradingView News Widget ── */
function TradingNews() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      feedMode: 'all_symbols',
      colorTheme: 'dark',
      isTransparent: true,
      displayMode: 'regular',
      width: '100%',
      height: '600',
      locale: 'en',
    });

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    containerRef.current.appendChild(widgetDiv);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  return (
    <div ref={containerRef} className="tradingview-widget-container" />
  );
}

export default function MarketInsightsPage() {
  return (
    <div className="animate-fadeIn" style={{ maxWidth: '1600px', margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--sp-3xl)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--display-md)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 'var(--sp-xs)' }}>
            Market Intelligence
          </h1>
          <p style={{ fontSize: 'var(--body-md)', opacity: 0.6 }}>Institutional Flows & Real-Time Market News</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="vault-insight-chip">STREAM: LIVE</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Institutional Section */}
        <div className="card" style={{ background: 'var(--surface-container-low)', padding: 'var(--sp-2xl)' }}>
          <div className="card-header" style={{ marginBottom: 'var(--sp-xl)' }}>
            <h3 className="card-title">Institutional Net Flow</h3>
          </div>
          <InstitutionalDashboard />
        </div>

        {/* News Section */}
        <div className="card" style={{ background: 'var(--surface-container-low)', padding: 'var(--sp-2xl)' }}>
          <div className="card-header" style={{ marginBottom: 'var(--sp-xl)' }}>
            <h3 className="card-title">Global Trading Timeline</h3>
          </div>
          <div style={{ overflow: 'hidden', borderRadius: 'var(--r-md)' }}>
            <TradingNews />
          </div>
        </div>
      </div>
    </div>
  );
}
