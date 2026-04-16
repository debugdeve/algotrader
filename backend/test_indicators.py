import sys
import os
import asyncio
import json

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from main import fetch_and_calculate

def test_indicators():
    print("Testing Technical Indicator Calculations for RELIANCE...")
    try:
        df = fetch_and_calculate("RELIANCE")
        if df is not None and not df.empty:
            latest = df.iloc[-1]
            print(f"Close: {latest['Close']}")
            print(f"EMA 200: {latest.get('EMA_200')}")
            print(f"RSI 14: {latest.get('RSI_14')}")
            print(f"Stoch RSI: {latest.get('STOCH_RSI')}")
            print(f"Ichimoku Span A: {latest.get('ICH_SPAN_A')}")
            print(f"Ichimoku Span B: {latest.get('ICH_SPAN_B')}")
            
            # Check for NaNs
            indicators = ['EMA_200', 'RSI_14', 'STOCH_RSI', 'ICH_SPAN_A', 'ICH_SPAN_B']
            for ind in indicators:
                if ind in latest and not pd.isna(latest[ind]):
                    print(f"[PASSED] {ind} successfully calculated.")
                else:
                    print(f"[FAILED] {ind} is MISSING or NaN.")
        else:
            print("[ERROR] fetch_and_calculate returned None or empty DF.")
    except Exception as e:
        print(f"[CRASH] {str(e)}")

if __name__ == "__main__":
    import pandas as pd
    test_indicators()
