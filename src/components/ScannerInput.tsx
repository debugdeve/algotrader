/**
 * src/components/ScannerInput.tsx
 * 
 * Frontend scaffolding for the Multi-Timeframe Scanner module.
 * Provides a text-based sandbox for submitting mixed-timeframe queries and 
 * displays the resulting Abstract Syntax Tree (AST) mapped directly from the Regex parser.
 */

import React, { useState } from 'react';
import { compileQueryToAST } from '../utils/queryParser';

const ScannerInput: React.FC = () => {
  const [query, setQuery] = useState<string>('[Daily] RSI_14 > 60 AND [15m] Close > SMA_20');
  const [astOutput, setAstOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompile = () => {
    setError(null);
    setAstOutput(null);

    try {
      // 1. Compile textual AST
      const ast = compileQueryToAST(query);
      
      // 2. Output the simulated payload that will be routed to the Python Backend
      const payload = {
        universe: ["RELIANCE", "TCS", "HDFCBANK"],
        ast: ast,
        max_lookback: 50 // Ensures the engine fetches at least 50 historical periods
      };

      setAstOutput(JSON.stringify(payload, null, 2));

      // Note: Future Step is integrating this fetch
      /*
      await fetch('/api/mtf-scan', {
         method: 'POST',
         body: JSON.stringify(payload)
      });
      */

    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-6 shadow-2xl max-w-4xl mx-auto my-8 font-sans">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <span>⏱️</span> Multi-Timeframe Scanner Setup
        </h2>
        <p className="text-slate-400 mt-2 text-sm">
          Write custom logic combining signals from completely different timeframes directly in one query.
          The engine will automatically handle timestamp alignments without lookahead bias.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Input Interface */}
        <div className="relative">
          <label className="block text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-2">
            Target Syntax Query
          </label>
          <input 
            type="text" 
            className="w-full bg-slate-950/50 border border-slate-800 text-emerald-300 font-mono text-sm rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="[Daily] RSI_14 > 60 AND [15m] Close < SMA_50"
          />
        </div>

        {/* Controls */}
        <div className="flex justify-start">
          <button 
            onClick={handleCompile}
            className="bg-cyan-600 hover:bg-cyan-500 text-slate-900 font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
          >
            ⚙️ Compile to Execution Engine AST
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-900/30 border border-red-500/50 text-red-400 font-mono text-sm">
            ❌ {error}
          </div>
        )}

        {/* AST Graph Simulation Display */}
        {astOutput && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Compiled JSON Engine Payload (Ready for Python API):</h3>
            <pre className="bg-slate-950 border border-slate-800 rounded-lg p-5 overflow-x-auto text-xs text-slate-300 font-mono leading-relaxed shadow-inner">
              {astOutput}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScannerInput;
