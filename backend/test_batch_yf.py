import yfinance as yf
import pandas as pd

def test_batch():
    symbols = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK"]
    tickers = [f"{s}.NS" for s in symbols]
    tickers_str = " ".join(tickers)
    print(f"Downloading {tickers_str}...")
    df = yf.download(tickers_str, period="1y", interval="1d", progress=False, group_by='ticker')
    print("Columns:", df.columns.levels[0].tolist() if isinstance(df.columns, pd.MultiIndex) else df.columns.tolist())
    print("Dataframe empty:", df.empty)
    if not df.empty:
        for s in tickers:
            if s in df.columns.get_level_values(0):
                print(f"Found {s}")
            else:
                print(f"Missing {s}")

if __name__ == "__main__":
    test_batch()
