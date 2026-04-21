import yfinance as yf
import pandas as pd

def test_indicators():
    symbol = "RELIANCE.NS"
    print(f"Testing {symbol}...")
    df = yf.download(symbol, period="1y", interval="1d", progress=False)
    
    if isinstance(df.columns, pd.MultiIndex):
        if symbol in df.columns.get_level_values(0):
            df = df[symbol]
        else:
            df = df.xs(symbol, axis=1, level=1)
            
    for col in df.columns:
        if isinstance(df[col], pd.DataFrame):
            df[col] = df[col].iloc[:, 0]
            
    print("Columns after extraction:", df.columns.tolist())
    print("Types:", {col: type(df[col]) for col in df.columns})
    
    # This is the line that might be failing
    delta = df['Close'].diff()
    print("Delta type:", type(delta))
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    print("Gain type:", type(gain))
    
    # Indicators
    df['EMA_20'] = df['Close'].ewm(span=20, adjust=False).mean()
    print("EMA_20 type:", type(df['EMA_20']))
    
    # RSI
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / (loss + 1e-9)
    df['RSI_14'] = 100 - (100 / (1 + rs))
    
    print("RSI_14 type:", type(df['RSI_14']))
    
    latest = df.iloc[-1]
    print("Latest type:", type(latest))
    print("RSI check:", latest['RSI_14'] > 70)

if __name__ == "__main__":
    test_indicators()
