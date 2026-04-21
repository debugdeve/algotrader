import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

export const config = {
  runtime: 'edge', // Opt-in to Edge Runtime for blistering fast AI streaming
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'No prompt provided' }), { status: 400 });
    }

    // Call Anthropic explicitly translating unstructured sentiment into Backend-ready logic
    const result = await generateObject({
      model: anthropic('claude-3-5-sonnet-20240620'),
      schema: z.object({
        filters: z.array(z.object({
          indicator: z.string().describe("Technical indicator name (e.g., 'RSI_14', 'EMA_50', 'MACD', 'STOCH_RSI', 'ICH_SPAN_A', 'ICH_SPAN_B', 'CLOSE')"),
          operator: z.enum(['>', '<', '==', 'crossover', 'crossunder']).describe("Mathematical operator"),
          value: z.union([z.number(), z.string()]).describe("Comparison value or indicator name"),
        })).describe("List of technical filters to apply."),
        sector: z.string().nullable().describe("Target sector if specified (e.g., 'IT', 'BANKING', 'AUTO'). Null if broad market."),
        timeframe: z.enum(['1d', '1h', '15m']).describe("Requested analysis timeframe."),
        interpreted_description: z.string().describe("Human-readable summary of the interpreted strategy."),
        clarification_needed: z.boolean().describe("True if the query is ambiguous or lacks technical detail."),
      }),
      system: `### ROLE
You are the "AlgoEdge Technical Translator." Your sole purpose is to convert a user's natural language trading query into a structured JSON filter object for a Nifty 500 stock scanner. 

### KNOWLEDGE BASE (INDICATOR GROUNDING)
You must map intent to these specific mathematical definitions only:
1. RSI (14): "Oversold" = < 30, "Overbought" = > 70
2. MACD (12, 26, 9): "Bullish Crossover" = macd_line > signal_line AND prev_macd_line <= prev_signal_line
3. Stochastic RSI: "Fast reversal" or "Extreme oversold" = stoch_rsi < 20.
4. EMA (20, 50, 200): "Golden Cross" = EMA50 crosses above EMA200.
5. Ichimoku Cloud: "Bullish Trend" = Close > ICH_SPAN_A AND Close > ICH_SPAN_B.

### 3-STAGE INTERPRETATION PROCESS
1. DISCOVERY: Separate market sentiment ("I am bullish on tech") from technical triggers ("stocks above 200 EMA").
2. MAPPING: Match identified triggers to strictly supported indicators in the Knowledge Base.
3. REFINEMENT: If the user is vague ("find strong stocks"), default to EMA 50 > EMA 200 + RSI > 50.

### CONSTRAINTS
- Return ONLY valid JSON.
- If a sector is mentioned (e.g., "Banks"), populate the 'sector' field.
- If timeframe is not mentioned, default to '1d'.`,
      prompt: `Translate this query: "${prompt}"`,
    });

    return new Response(JSON.stringify(result.object), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error("AI Generation Error:", err);
    return new Response(JSON.stringify({ error: err.message || 'AI request failed' }), { status: 500 });
  }
}
