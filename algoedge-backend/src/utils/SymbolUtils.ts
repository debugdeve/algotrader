import { NIFTY_500 } from '../data/nseUniverse';

export interface SymbolChunk {
  pageId: number;
  symbols: string[];
}

export class SymbolUtils {
  /**
   * Splits NIFTY_500 symbols into X chunks
   */
  static getChunks(chunkSize: number = 50): SymbolChunk[] {
    const symbols = NIFTY_500.map(s => s.symbol);
    const chunks: SymbolChunk[] = [];
    
    for (let i = 0; i < symbols.length; i += chunkSize) {
      chunks.push({
        pageId: Math.floor(i / chunkSize) + 1,
        symbols: symbols.slice(i, i + chunkSize)
      });
    }

    return chunks;
  }
}
