/**
 * A heuristic local NLP engine for translating simple text commands into CustomScreener logic.
 * This simulates AI mapping Natural Language to technical indicator requirements.
 */
export function parseMagicFilter(text) {
  const t = text.toLowerCase();
  let conditions = [];

  const addCondition = (leftName, operator, rightType, rightNameOrVal, leftPeriod=null, rightPeriod=null) => {
    conditions.push({
      id: Date.now() + Math.random(),
      leftName,
      leftPeriod: leftPeriod ? leftPeriod.toString() : '',
      operator,
      rightType,
      rightName: rightType === 'indicator' ? rightNameOrVal : '',
      rightPeriod: rightType === 'indicator' && rightPeriod ? rightPeriod.toString() : '',
      rightValue: rightType === 'number' ? rightNameOrVal.toString() : ''
    });
  };

  // Rule 1: RSI Bounds
  if (t.includes('rsi oversold')) {
    addCondition('rsi', '<', 'number', '30', 14);
  } else if (t.includes('rsi overbought')) {
    addCondition('rsi', '>', 'number', '70', 14);
  } else if (t.match(/rsi\s*>\s*(\d+)/)) {
    const val = t.match(/rsi\s*>\s*(\d+)/)[1];
    addCondition('rsi', '>', 'number', val, 14);
  } else if (t.match(/rsi( less than|<)\s*(\d+)/)) {
    const val = t.match(/rsi( less than|<)\s*(\d+)/)[2];
    addCondition('rsi', '<', 'number', val, 14);
  }

  // Rule 2: MACD Crossovers
  if (t.includes('macd bullish') || t.includes('macd positive') || t.includes('macd crossover')) {
    addCondition('macd', '>', 'number', '0');
  } else if (t.includes('macd negative') || t.includes('macd bearish')) {
    addCondition('macd', '<', 'number', '0');
  }

  // Rule 3: Volume surges
  if (t.includes('rising volume') || t.includes('high volume')) {
    addCondition('volume', '>', 'number', '1000000');
  }

  // Rule 4: Price / Moving Averages
  if (t.includes('golden cross')) {
    addCondition('sma', 'crossover', 'indicator', 'sma', 50, 200);
  } else if (t.includes('death cross')) {
    addCondition('sma', 'crossunder', 'indicator', 'sma', 50, 200);
  } else if (t.match(/price\s*(above|>)\s*(\d+)[ -]*(sma|ema)/)) {
    const match = t.match(/price\s*(above|>)\s*(\d+)[ -]*(sma|ema)/);
    const period = match[2];
    const ind = match[3];
    addCondition('close', '>', 'indicator', ind, null, period);
  } else if (t.match(/stocks up by\s*(\d+)/)) {
    addCondition('close', '>', 'indicator', 'open');
  }

  // Fallback if empty array
  if (conditions.length === 0) {
    addCondition('close', '>', 'indicator', 'sma', null, 20);
  }

  return conditions;
}
