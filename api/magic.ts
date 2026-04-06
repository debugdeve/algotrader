import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

export const config = {
  runtime: 'edge', // Opt-in to Edge Runtime for blistering fast AI streaming
};

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'No prompt provided' }), { status: 400 });
    }

    // Call Anthropic explicitly translating unstructured sentiment into Backend-ready logic
    const result = await generateObject({
      model: anthropic('claude-3-5-sonnet-20240620'),
      schema: z.object({
        logic: z.array(z.object({
          left: z.object({
            name: z.string().describe("Indicator name e.g. 'rsi', 'macd', 'ema', 'close', 'sma'"),
            period: z.number().optional().describe("Period if applicable e.g. 14 for RSI, 20 for SMA. Null for Close."),
          }),
          operator: z.enum(['>', '<', '==', 'crossover', 'crossunder']),
          right: z.object({
             name: z.string(),
             period: z.number().optional(),
          }).optional().describe("Right side indicator. Leave undefined if comparing to a raw number."),
          right_value: z.number().optional().describe("Right side static threshold. E.g. 30 if targeting RSI < 30."),
        })).describe("The strictly typed payload representing the scanner conditions to execute."),
        researchSummary: z.string().describe("A 2 sentence research-backed justification explaining why this strategy might be relevant in current market conditions."),
        recommendedTickers: z.array(z.string()).describe("List of 2-3 specific Indian NSE stocks (e.g. 'RELIANCE', 'TCS') that famously exhibit these behaviors."),
      }),
      prompt: `Analyze this algorithmic trading query from an Indian Stock Market investor: "${prompt}". 
               Extract the technical indicator logic strictly mapped to the provided Zod Schema. 
               Only output indicators that exist broadly (RSI, MACD, EMA, SMA, CLOSE).`,
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
