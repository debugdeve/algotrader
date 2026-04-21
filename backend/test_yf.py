import yfinance as yf
import pandas as pd

def test_yf():
    symbol = "RELIANCE.NS"
    print(f"Testing {symbol}...")
    df = yf.download(symbol, period="3mo", interval="1d", progress=False)
    print(f"Dataframe empty: {df.empty}")
    if not df.empty:
        print(df.head())
    else:
        print("No data found.")

if __name__ == "__main__":
    test_yf()
