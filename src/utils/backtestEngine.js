// Backtesting engine for strategy simulation

import { calculateRSI, calculateMACD, calculateStochRSI, calculateEMA } from './indicators.js';

/**
 * Run a backtest on historical data with a compiled visual strategy
 * @param {Object} params
 * @param {number[]} params.prices - Array of closing prices
 * @param {string[]} params.dates - Array of date strings
 * @param {Object} params.strategy - Compiled strategy specification
 * @param {number} params.initialCapital - Starting capital
 * @returns {Object} Backtest results
 */
export function runBacktest({ prices, dates, strategy, initialCapital = 100000 }) {
  // 1. Determine which indicators need to be pre-calculated
  const indicatorResults = preCalculateIndicators(prices, strategy.entry_conditions);

  let capital = initialCapital;
  let position = 0;
  let entryPrice = 0;
  const trades = [];
  const equityCurve = [];
  let maxEquity = initialCapital;
  let maxDrawdown = 0;
  let wins = 0;
  let losses = 0;

  // We start after the longest indicator buffer (approx 50 periods)
  for (let i = 50; i < prices.length; i++) {
    const currentPrice = prices[i];
    const equity = capital + position * currentPrice;

    equityCurve.push({
      date: dates[i],
      equity: Math.round(equity * 100) / 100,
      price: currentPrice,
    });

    // Drawdown calculation
    if (equity > maxEquity) maxEquity = equity;
    const dd = ((maxEquity - equity) / maxEquity) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;

    // Entry logic (Strategy Tree)
    if (position === 0) {
      if (evaluateLogicNode(strategy.entry_conditions, indicatorResults, i, prices)) {
        const qty = Math.floor(capital / currentPrice);
        if (qty > 0) {
          position = qty;
          entryPrice = currentPrice;
          capital -= qty * currentPrice;
          trades.push({
            type: 'BUY',
            date: dates[i],
            price: currentPrice,
            qty,
            value: qty * currentPrice,
          });
        }
      }
    }
    // Exit logic (Stop Loss / Take Profit)
    else if (position > 0) {
      let sellSignal = false;
      const risk = strategy.risk_profile || {};

      // Stop loss
      if (risk.sl_pct > 0) {
        if (currentPrice <= entryPrice * (1 - risk.sl_pct / 100)) {
          sellSignal = true;
        }
      }

      // Take profit
      if (risk.tp_pct > 0) {
        if (currentPrice >= entryPrice * (1 + risk.tp_pct / 100)) {
          sellSignal = true;
        }
      }

      // Optional: Add logic-based exits if exit_conditions exist in strategy
      // if (strategy.exit_conditions && evaluateLogicNode(strategy.exit_conditions, indicatorResults, i, prices)) {
      //   sellSignal = true;
      // }

      if (sellSignal) {
        const sellValue = position * currentPrice;
        const pnl = sellValue - position * entryPrice;
        capital += sellValue;

        trades.push({
          type: 'SELL',
          date: dates[i],
          price: currentPrice,
          qty: position,
          value: sellValue,
          pnl: Math.round(pnl * 100) / 100,
        });

        if (pnl > 0) wins++;
        else losses++;

        position = 0;
        entryPrice = 0;
      }
    }
  }

  // Finalize statistics
  return finalizeResults(trades, equityCurve, initialCapital, wins, losses, maxDrawdown);
}

/**
 * Pre-calculates all indicators mentioned in the logic tree
 */
function preCalculateIndicators(prices, node, cache = {}) {
  if (!node) return cache;

  if (node.type === 'CONDITION') {
    const key = JSON.stringify({ indicator: node.indicator, params: node.params });
    if (!cache[key]) {
      if (node.indicator === 'RSI') {
        cache[key] = calculateRSI(prices, node.params.period || 14);
      } else if (node.indicator === 'EMA') {
        cache[key] = calculateEMA(prices, node.params.period || 20);
      } else if (node.indicator === 'MACD') {
        cache[key] = calculateMACD(prices, node.params.macdFast || 12, node.params.macdSlow || 26, node.params.macdSignal || 9).histogram;
      } else if (node.indicator === 'Stochastic RSI') {
        cache[key] = calculateStochRSI(prices, node.params.rsiPeriod || 14, 14, 3, 3).k;
      }
    }
  }

  if (node.children) {
    node.children.forEach(child => preCalculateIndicators(prices, child, cache));
  }

  return cache;
}

/**
 * Recursively evaluates the logic tree at a specific time index
 */
function evaluateLogicNode(node, indicatorResults, index, prices) {
  if (!node) return false;

  if (node.type === 'GATE') {
    if (node.operator === 'AND') {
      return node.children.every(child => evaluateLogicNode(child, indicatorResults, index, prices));
    }
    if (node.operator === 'OR') {
      return node.children.some(child => evaluateLogicNode(child, indicatorResults, index, prices));
    }
  }

  if (node.type === 'CONDITION') {
    const key = JSON.stringify({ indicator: node.indicator, params: node.params });
    const currentValue = indicatorResults[key] ? indicatorResults[key][index] : null;

    if (currentValue === null || currentValue === undefined) return false;

    const threshold = parseFloat(node.params.threshold || 0);
    const prevValue = indicatorResults[key][index - 1];

    switch (node.params.condition || '<') {
      case '<': return currentValue < threshold;
      case '>': return currentValue > threshold;
      case 'CROSS_ABOVE': return prevValue <= threshold && currentValue > threshold;
      case 'CROSS_BELOW': return prevValue >= threshold && currentValue < threshold;
      case 'ABOVE_PRICE': return currentValue > prices[index];
      case 'BELOW_PRICE': return currentValue < prices[index];
      default: return false;
    }
  }

  return false;
}

function finalizeResults(trades, equityCurve, initialCapital, wins, losses, maxDrawdown) {
  const finalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : initialCapital;
  const totalReturn = ((finalEquity - initialCapital) / initialCapital) * 100;
  const totalTrades = Math.floor(trades.length / 2);
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

  // Calculate Sharpe Ratio (simplified)
  const returns = [];
  for (let i = 1; i < equityCurve.length; i++) {
    returns.push((equityCurve[i].equity - equityCurve[i - 1].equity) / (equityCurve[i - 1].equity || 1));
  }
  const avgReturn = returns.length > 0 ? (returns.reduce((s, r) => s + r, 0) / returns.length) : 0;
  const stdReturn = returns.length > 0 ? Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / returns.length) : 0;
  const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;

  return {
    equityCurve,
    trades,
    metrics: {
      initialCapital,
      finalEquity: Math.round(finalEquity * 100) / 100,
      totalReturn: Math.round(totalReturn * 100) / 100,
      totalTrades,
      wins,
      losses,
      winRate: Math.round(winRate * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    },
  };
}
