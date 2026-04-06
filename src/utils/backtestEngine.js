// Backtesting engine for strategy simulation

import { calculateRSI, calculateMACD, calculateStochRSI, calculateEMA } from './indicators';

/**
 * Run a backtest on historical data with given strategy parameters
 * @param {Object} params
 * @param {number[]} params.prices - Array of closing prices
 * @param {string[]} params.dates - Array of date strings
 * @param {Object} params.strategy - Strategy parameters
 * @param {number} params.initialCapital - Starting capital
 * @returns {Object} Backtest results with trades, equity curve, and metrics
 */
export function runBacktest({ prices, dates, strategy, initialCapital = 100000 }) {
  const rsi = calculateRSI(prices, strategy.rsiPeriod || 14);
  const macd = calculateMACD(prices, strategy.macdFast || 12, strategy.macdSlow || 26, strategy.macdSignal || 9);
  const stochRSI = calculateStochRSI(prices, strategy.stochRsiPeriod || 14, 14, 3, 3);
  const ema = calculateEMA(prices, strategy.emaPeriod || 20);

  let capital = initialCapital;
  let position = 0;
  let entryPrice = 0;
  const trades = [];
  const equityCurve = [];
  let maxEquity = initialCapital;
  let maxDrawdown = 0;
  let wins = 0;
  let losses = 0;

  for (let i = 50; i < prices.length; i++) {
    const currentPrice = prices[i];
    const currentRSI = rsi[i];
    const currentMACD = macd.histogram[i];
    const currentStochK = stochRSI.k[i];
    const currentEMA = ema[i];
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

    // Entry logic
    if (position === 0) {
      let buySignal = true;

      if (strategy.useRSI && currentRSI !== null) {
        buySignal = buySignal && currentRSI < (strategy.rsiBuyThreshold || 35);
      }
      if (strategy.useMACD) {
        buySignal = buySignal && currentMACD > 0;
      }
      if (strategy.useStochRSI && currentStochK !== null) {
        buySignal = buySignal && currentStochK < (strategy.stochBuyThreshold || 25);
      }
      if (strategy.useEMA) {
        buySignal = buySignal && currentPrice > currentEMA;
      }

      if (buySignal) {
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
    // Exit logic
    else if (position > 0) {
      let sellSignal = false;

      if (strategy.useRSI && currentRSI !== null) {
        sellSignal = sellSignal || currentRSI > (strategy.rsiSellThreshold || 65);
      }
      if (strategy.useMACD) {
        sellSignal = sellSignal || currentMACD < 0;
      }
      if (strategy.useStochRSI && currentStochK !== null) {
        sellSignal = sellSignal || currentStochK > (strategy.stochSellThreshold || 75);
      }
      if (strategy.useEMA) {
        sellSignal = sellSignal || currentPrice < currentEMA;
      }

      // Stop loss
      if (strategy.stopLoss) {
        const slPercent = strategy.stopLossPercent || 3;
        if (currentPrice <= entryPrice * (1 - slPercent / 100)) {
          sellSignal = true;
        }
      }

      // Take profit
      if (strategy.takeProfit) {
        const tpPercent = strategy.takeProfitPercent || 5;
        if (currentPrice >= entryPrice * (1 + tpPercent / 100)) {
          sellSignal = true;
        }
      }

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

  // Close open position at last price
  if (position > 0) {
    const lastPrice = prices[prices.length - 1];
    const sellValue = position * lastPrice;
    const pnl = sellValue - position * entryPrice;
    capital += sellValue;
    trades.push({
      type: 'SELL',
      date: dates[dates.length - 1],
      price: lastPrice,
      qty: position,
      value: sellValue,
      pnl: Math.round(pnl * 100) / 100,
    });
    if (pnl > 0) wins++;
    else losses++;
    position = 0;
  }

  const finalEquity = capital;
  const totalReturn = ((finalEquity - initialCapital) / initialCapital) * 100;
  const totalTrades = Math.floor(trades.length / 2);
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

  // Calculate Sharpe Ratio (simplified, annualized)
  const returns = [];
  for (let i = 1; i < equityCurve.length; i++) {
    returns.push((equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity);
  }
  const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
  const stdReturn = Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / returns.length);
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
