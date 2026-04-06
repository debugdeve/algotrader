/**
 * src/utils/dataAligner.ts
 * 
 * Crucial Data Integrity engine. Responsible for avoiding "Look-Ahead Bias"
 * when executing Multi-Timeframe trading logic.
 */

import { OHLCV } from '../types/scanner';

/**
 * Aligns two timelines (e.g., matching a 15-minute candle to the correct Daily candle data).
 * 
 * THE GOLDEN RULE OF BACKTESTING ALIGNMENT: 
 * If you are evaluating logic at 11:15 AM Tuesday, the Daily candle metric you reference 
 * MUST NOT leak data from exactly 15:30 PM Tuesday (the market close). It can only contain
 * pricing action up through exactly 11:15 AM (Live Rolling) OR Monday's Close (Static).
 * 
 * @param executionTimestamp The strictly defined moment in time we are checking logic (in Unix ms)
 * @param macroOhlcvSeries The higher-timeframe data array (e.g., the Daily OHLCV data)
 * @returns The specific OHLCV tick from the `macroOhlcvSeries` that was active at the `executionTimestamp`.
 */
export function getAlignedMacroCandle(executionTimestamp: number, macroOhlcvSeries: OHLCV[]): OHLCV | null {
  if (!macroOhlcvSeries || macroOhlcvSeries.length === 0) return null;

  // Uses LOCF (Last Observation Carried Forward).
  // We scan the higher timeframe array to find the very last candle that started 
  // at or before our execution timestamp.
  
  // Note: For massive arrays, consider replacing this linear backward scan with a Binary Search for performance.
  for (let i = macroOhlcvSeries.length - 1; i >= 0; i--) {
    const macroCandle = macroOhlcvSeries[i];
    
    if (macroCandle.timestamp <= executionTimestamp) {
        // FOUND ALIGNMENT:
        // This is the correct macro candle that corresponds to our intraday execution.
        // It guarantees we are not peeking at a macro candle that occurs in the future.
        return macroCandle;
    }
  }

  // If no macro candle exists prior to the execution time (too early in history)
  return null;
}

/**
 * Computes aligned multi-timeframe arrays based entirely off the baseline history
 * @param baseIntradaySeries The fast series (e.g. 5m) mapping every evaluation point
 * @param macroDailySeries The slow series (e.g. 1D) to align against
 * @returns An array mapping every base intraday timestamp to its concurrently active Daily candle
 */
export function alignEntireSeries(baseIntradaySeries: OHLCV[], macroDailySeries: OHLCV[]): { evaluationTime: number; baseData: OHLCV; alignedMacroData: OHLCV | null }[] {
    return baseIntradaySeries.map(baseCandle => {
        return {
            evaluationTime: baseCandle.timestamp,
            baseData: baseCandle,
            alignedMacroData: getAlignedMacroCandle(baseCandle.timestamp, macroDailySeries)
        };
    });
}
