// Technical indicator calculations for stock analysis

/**
 * Calculate Exponential Moving Average
 * @param {number[]} data - Array of closing prices
 * @param {number} period - EMA period
 * @returns {number[]} EMA values
 */
export function calculateEMA(data, period) {
  const k = 2 / (period + 1);
  const ema = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

/**
 * Calculate Relative Strength Index
 * @param {number[]} data - Array of closing prices
 * @param {number} period - RSI period (default 14)
 * @returns {number[]} RSI values
 */
export function calculateRSI(data, period = 14) {
  const rsi = [];
  const gains = [];
  const losses = [];

  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  let avgGain = gains.slice(0, period).reduce((s, g) => s + g, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((s, l) => s + l, 0) / period;

  // Fill initial RSI values as null
  for (let i = 0; i < period; i++) rsi.push(null);

  rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }

  return rsi;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * @param {number[]} data - Array of closing prices
 * @param {number} fastPeriod - Fast EMA period (default 12)
 * @param {number} slowPeriod - Slow EMA period (default 26)
 * @param {number} signalPeriod - Signal EMA period (default 9)
 * @returns {{ macd: number[], signal: number[], histogram: number[] }}
 */
export function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  const macdLine = fastEMA.map((f, i) => f - slowEMA[i]);
  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram = macdLine.map((m, i) => m - signalLine[i]);

  return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * Calculate Stochastic RSI
 * @param {number[]} data - Array of closing prices
 * @param {number} rsiPeriod - RSI period (default 14)
 * @param {number} stochPeriod - Stochastic period (default 14)
 * @param {number} kSmooth - %K smoothing (default 3)
 * @param {number} dSmooth - %D smoothing (default 3)
 * @returns {{ k: number[], d: number[] }}
 */
export function calculateStochRSI(data, rsiPeriod = 14, stochPeriod = 14, kSmooth = 3, dSmooth = 3) {
  const rsi = calculateRSI(data, rsiPeriod);
  const stochRSI = [];

  for (let i = 0; i < rsi.length; i++) {
    if (rsi[i] === null || i < stochPeriod + rsiPeriod - 1) {
      stochRSI.push(null);
      continue;
    }

    const segment = rsi.slice(i - stochPeriod + 1, i + 1).filter(v => v !== null);
    const minRSI = Math.min(...segment);
    const maxRSI = Math.max(...segment);
    const range = maxRSI - minRSI;
    stochRSI.push(range === 0 ? 50 : ((rsi[i] - minRSI) / range) * 100);
  }

  // Smooth for %K
  const k = calculateSMA(stochRSI, kSmooth);
  // Smooth for %D
  const d = calculateSMA(k, dSmooth);

  return { k, d };
}

/**
 * Simple Moving Average (helper)
 */
function calculateSMA(data, period) {
  const sma = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i] === null || i < period - 1) {
      sma.push(null);
      continue;
    }
    const segment = data.slice(i - period + 1, i + 1).filter(v => v !== null);
    if (segment.length < period) {
      sma.push(null);
    } else {
      sma.push(segment.reduce((s, v) => s + v, 0) / segment.length);
    }
  }
  return sma;
}

/**
 * Generate a signal based on indicator values
 */
export function getSignal(rsi, macdHist, stochK) {
  let score = 0;

  // RSI signal
  if (rsi !== null) {
    if (rsi < 30) score += 2;
    else if (rsi < 40) score += 1;
    else if (rsi > 70) score -= 2;
    else if (rsi > 60) score -= 1;
  }

  // MACD histogram signal
  if (macdHist !== undefined) {
    if (macdHist > 0.5) score += 1;
    else if (macdHist < -0.5) score -= 1;
  }

  // Stochastic RSI signal
  if (stochK !== null && stochK !== undefined) {
    if (stochK < 20) score += 1;
    else if (stochK > 80) score -= 1;
  }

  if (score >= 2) return 'BUY';
  if (score <= -2) return 'SELL';
  return 'NEUTRAL';
}
