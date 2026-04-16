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
    addCondition('rsi_14', '<', 'number', '30');
  } else if (t.includes('rsi overbought')) {
    addCondition('rsi_14', '>', 'number', '70');
  } else if (t.includes('extreme oversold') || t.includes('fast reversal') || t.includes('stoch rsi')) {
    addCondition('stoch_rsi', '<', 'number', '20');
  }

  // Rule 2: MACD Crossovers
  if (t.includes('macd bullish') || t.includes('macd positive') || t.includes('macd crossover')) {
    addCondition('macd', '>', 'indicator', 'macd_signal');
  }

  // Rule 3: Moving Averages & Ichimoku
  if (t.includes('golden cross')) {
    addCondition('ema', '>', 'indicator', 'ema', 50, 200);
  } else if (t.includes('ichimoku bullish') || t.includes('above cloud')) {
    addCondition('close', '>', 'indicator', 'ich_span_a');
    addCondition('close', '>', 'indicator', 'ich_span_b');
  } else if (t.includes('above 200 ema') || t.includes('long term bullish')) {
    addCondition('close', '>', 'indicator', 'ema', null, 200);
  }

  // Rule 4: Volume surges
  if (t.includes('rising volume') || t.includes('high volume')) {
    addCondition('volume', '>', 'number', '1000000');
  }

  // Fallback if empty array
  if (conditions.length === 0) {
    addCondition('close', '>', 'indicator', 'sma', null, 20);
  }

  return conditions;
}
