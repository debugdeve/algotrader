const { compileStrategy } = require('../src/utils/strategyCompiler');
const { runBacktest } = require('../src/utils/backtestEngine');

// Mock nodes for a "RSI < 30" strategy
const nodes = [
  { 
    id: 'rsi-1', 
    type: 'indicatorNode', 
    data: { name: 'RSI', params: { period: 14, threshold: 30, condition: '<' } } 
  },
  { 
    id: 'logic-1', 
    type: 'logicNode', 
    data: { operator: 'AND' } 
  },
  { 
    id: 'entry-1', 
    type: 'entryNode', 
    data: { label: 'RSI Bottom Strategy' } 
  },
  { 
    id: 'exit-1', 
    type: 'exitNode', 
    data: { params: { stopLossPct: 2, targetPct: 5 } } 
  }
];

const edges = [
  { id: 'e1', source: 'rsi-1', target: 'logic-1' },
  { id: 'e2', source: 'logic-1', target: 'entry-1' }
];

try {
  console.log('--- TESTING COMPILER ---');
  const compiled = compileStrategy(nodes, edges);
  console.log('Compiled Strategy:', JSON.stringify(compiled, null, 2));

  console.log('\n--- TESTING BACKTEST ENGINE ---');
  // Mock some price data
  const prices = Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i / 5) * 20);
  const dates = Array.from({ length: 100 }, (_, i) => `2023-01-${i + 1}`);

  const results = runBacktest({
    prices,
    dates,
    strategy: compiled,
    initialCapital: 100000
  });

  console.log('Backtest Results Summary:');
  console.log('Final Equity:', results.metrics.finalEquity);
  console.log('Total Trades:', results.metrics.totalTrades);
  console.log('Total Return:', results.metrics.totalReturn + '%');

} catch (err) {
  console.error('Test Failed:', err.message);
  process.exit(1);
}
