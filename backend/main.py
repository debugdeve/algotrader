from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import yfinance as yf
import json
import os
import concurrent.futures
from typing import List, Optional
from pydantic import BaseModel

# --- 1. GLOBAL DATA LOADER (No more hardcoding!) ---
BASE_DIR = os.path.dirname(__file__)
MARKET_CAP_PATH = os.path.join(BASE_DIR, "market_caps.json")
NSE_500_PATH = os.path.join(BASE_DIR, "nse_500.json")

# Load Market Cap Mapping
try:
    with open(MARKET_CAP_PATH, "r") as f:
        CAP_DATA = json.load(f)
except Exception:
    CAP_DATA = {"LARGE_CAPS": [], "MID_CAPS": []}

# Load the Full Nifty 500 Universe
try:
    with open(NSE_500_PATH, "r") as f:
        FULL_NSE_500_LIST = json.load(f)
    print(f"✅ Successfully loaded {len(FULL_NSE_500_LIST)} stocks from nse_500.json")
except Exception as e:
    print(f"❌ ERROR: Could not load nse_500.json: {e}")
    FULL_NSE_500_LIST = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK"] # Emergency fallback

app = FastAPI(title="Algo Trading Scanner API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Simplified for troubleshooting
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. TECHNICAL INDICATOR ENGINE ---

def fetch_and_calculate(symbol: str):
    try:
        ticker = f"{symbol}.NS" if not symbol.endswith(".NS") else symbol
        df = yf.download(ticker, period="3mo", interval="1d", progress=False)
        
        if df.empty: return None
        if isinstance(df.columns, pd.MultiIndex): df.columns = df.columns.get_level_values(0)

        df['EMA_20'] = df['Close'].ewm(span=20, adjust=False).mean()
        df['EMA_50'] = df['Close'].ewm(span=50, adjust=False).mean()
        df['EMA_200'] = df['Close'].ewm(span=200, adjust=False).mean()
        
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI_14'] = 100 - (100 / (1 + rs))

        # Stochastic RSI
        min_rsi = df['RSI_14'].rolling(window=14).min()
        max_rsi = df['RSI_14'].rolling(window=14).max()
        df['STOCH_RSI'] = (df['RSI_14'] - min_rsi) / (max_rsi - min_rsi) * 100
        
        ema_12 = df['Close'].ewm(span=12, adjust=False).mean()
        ema_26 = df['Close'].ewm(span=26, adjust=False).mean()
        df['MACD_12_26_9'] = ema_12 - ema_26
        df['MACDs_12_26_9'] = df['MACD_12_26_9'].ewm(span=9, adjust=False).mean()
        df['MACDh_12_26_9'] = df['MACD_12_26_9'] - df['MACDs_12_26_9']

        # Ichimoku Cloud (9, 26, 52)
        high_9 = df['High'].rolling(window=9).max()
        low_9 = df['Low'].rolling(window=9).min()
        tenkan = (high_9 + low_9) / 2

        high_26 = df['High'].rolling(window=26).max()
        low_26 = df['Low'].rolling(window=26).min()
        kijun = (high_26 + low_26) / 2

        df['ICH_SPAN_A'] = ((tenkan + kijun) / 2).shift(26)
        
        high_52 = df['High'].rolling(window=52).max()
        low_52 = df['Low'].rolling(window=52).min()
        df['ICH_SPAN_B'] = ((high_52 + low_52) / 2).shift(26)

        # Drop rows with NaN values
        df.dropna(inplace=True)
        return df
    except Exception as e:
        return None

# --- 3. ENDPOINTS ---

@app.get("/api/scan/nifty500")
async def scan_nifty500():
    """Returns the full 500 stock scan results."""
    try:
        tickers = [f"{s}.NS" for s in FULL_NSE_500_LIST]
        tickers_str = " ".join(tickers)
        
        df = yf.download(tickers_str, period="3mo", interval="1d", progress=False)
        
        close = df['Close']
        volume = df['Volume']
        
        ema20 = close.ewm(span=20, adjust=False).mean()
        ema50 = close.ewm(span=50, adjust=False).mean()
        ema200 = close.ewm(span=200, adjust=False).mean()
        
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))

        min_rsi = rsi.rolling(window=14).min()
        max_rsi = rsi.rolling(window=14).max()
        stoch_rsi = (rsi - min_rsi) / (max_rsi - min_rsi) * 100
        
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        macd = ema12 - ema26
        macd_signal = macd.ewm(span=9, adjust=False).mean()
        macd_hist = macd - macd_signal

        # Ichimoku
        high = df['High']
        low = df['Low']
        high9 = high.rolling(window=9).max()
        low9 = low.rolling(window=9).min()
        tenkan = (high9 + low9) / 2
        high26 = high.rolling(window=26).max()
        low26 = low.rolling(window=26).min()
        kijun = (high26 + low26) / 2
        span_a = ((tenkan + kijun) / 2).shift(26)
        high52 = high.rolling(window=52).max()
        low52 = low.rolling(window=52).min()
        span_b = ((high52 + low52) / 2).shift(26)
        
        last_close = close.iloc[-1]
        prev_close = close.iloc[-2]
        last_vol = volume.iloc[-1]
        last_rsi = rsi.iloc[-1]
        last_stoch_rsi = stoch_rsi.iloc[-1]
        last_ema20 = ema20.iloc[-1]
        last_ema50 = ema50.iloc[-1]
        last_ema200 = ema200.iloc[-1]
        last_macd = macd.iloc[-1]
        last_msig = macd_signal.iloc[-1]
        last_mhist = macd_hist.iloc[-1]
        last_span_a = span_a.iloc[-1]
        last_span_b = span_b.iloc[-1]
        
        results = []
        for symbol in FULL_NSE_500_LIST:
            tk = f"{symbol}.NS"
            try:
                c = last_close.get(tk)
                if pd.isna(c): continue
                
                pc = prev_close.get(tk)
                change_pct = ((c - pc) / pc) * 100 if pc else 0
                r = last_rsi.get(tk)
                sr = last_stoch_rsi.get(tk)
                e2 = last_ema20.get(tk)
                e5 = last_ema50.get(tk)
                e200 = last_ema200.get(tk)
                m = last_macd.get(tk)
                ms = last_msig.get(tk)
                mh = last_mhist.get(tk)
                sa = last_span_a.get(tk)
                sb = last_span_b.get(tk)
                
                sig = "NEUTRAL"
                if not pd.isna(r):
                    if r > 70: sig = "SELL" 
                    elif r < 30: sig = "BUY"
                    
                results.append({
                    "symbol": symbol,
                    "price": float(c),
                    "changePercent": float(change_pct),
                    "rsi": float(r) if not pd.isna(r) else None,
                    "ema20": float(e2) if not pd.isna(e2) else None,
                    "ema50": float(e5) if not pd.isna(e5) else None,
                    "ema200": float(e200) if not pd.isna(e200) else None,
                    "stochRsi": float(sr) if not pd.isna(sr) else None,
                    "macdLine": float(m) if not pd.isna(m) else None,
                    "macdSignal": float(ms) if not pd.isna(ms) else None,
                    "macdHist": float(mh) if not pd.isna(mh) else None,
                    "spanA": float(sa) if not pd.isna(sa) else None,
                    "spanB": float(sb) if not pd.isna(sb) else None,
                    "signal": sig,
                    "isLive": True
                })
            except: pass
                
        return {"stocks": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/scan/{symbol}")
async def scan_stock(symbol: str):
    """
    API Endpoint for the React Frontend to call.
    Example: GET /api/scan/RELIANCE
    """
    df = fetch_and_calculate(symbol)
    
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"Could not process data for {symbol}")

    latest_data = df.iloc[-1]
    
    response = {
        "symbol": symbol,
        "current_price": round(float(latest_data['Close']), 2),
        "rsi_14": round(float(latest_data['RSI_14']), 2),
        "stoch_rsi": round(float(latest_data['STOCH_RSI']), 2) if 'STOCH_RSI' in latest_data else None,
        "macd": round(float(latest_data['MACD_12_26_9']), 2),
        "macd_signal": round(float(latest_data['MACDs_12_26_9']), 2),
        "macd_histogram": round(float(latest_data['MACDh_12_26_9']), 2),
        "ema_20": round(float(latest_data['EMA_20']), 2),
        "ema_50": round(float(latest_data['EMA_50']), 2),
        "ema_200": round(float(latest_data['EMA_200']), 2) if 'EMA_200' in latest_data else None,
        "ich_span_a": round(float(latest_data['ICH_SPAN_A']), 2) if 'ICH_SPAN_A' in latest_data else None,
        "ich_span_b": round(float(latest_data['ICH_SPAN_B']), 2) if 'ICH_SPAN_B' in latest_data else None,
        "signal": "OVERBOUGHT" if latest_data['RSI_14'] > 70 else ("OVERSOLD" if latest_data['RSI_14'] < 30 else "NEUTRAL")
    }
    
    return response

# --- 4. CUSTOM SCREENER & STRATEGY ---

class IndicatorParam(BaseModel):
    name: str 
    period: Optional[int] = None
    
class ConditionParam(BaseModel):
    left: IndicatorParam
    operator: str 
    right: Optional[IndicatorParam] = None
    right_value: Optional[float] = None

class CustomScanRequest(BaseModel):
    conditions: List[ConditionParam]

def ensure_indicator_col(df, ind: IndicatorParam) -> str:
    name = ind.name.lower()
    if name in ['close', 'open', 'volume']: return name.capitalize()
    
    period = ind.period if ind.period else 14
    if name == 'sma':
        col = f"SMA_{period}"
        if col not in df.columns: df[col] = df['Close'].rolling(window=period).mean()
        return col
    elif name == 'ema':
        col = f"EMA_{period}"
        if col not in df.columns: df[col] = df['Close'].ewm(span=period, adjust=False).mean()
        return col
    elif name == 'rsi':
        col = f"RSI_{period}"
        if col not in df.columns:
            delta = df['Close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
            df[col] = 100 - (100 / (1 + (gain/loss)))
        return col
    elif name == 'stoch_rsi':
        col = 'STOCH_RSI'
        if col not in df.columns:
            # Re-calculate RSI if not present
            if 'RSI_14' not in df.columns:
                delta = df['Close'].diff()
                gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
                loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
                df['RSI_14'] = 100 - (100 / (1 + (gain / loss)))
            min_rsi = df['RSI_14'].rolling(window=14).min()
            max_rsi = df['RSI_14'].rolling(window=14).max()
            df[col] = (df['RSI_14'] - min_rsi) / (max_rsi - min_rsi) * 100
        return col
    elif name == 'ich_span_a':
        col = 'ICH_SPAN_A'
        if col not in df.columns:
            high_9 = df['High'].rolling(window=9).max()
            low_9 = df['Low'].rolling(window=9).min()
            tenkan = (high_9 + low_9) / 2
            high_26 = df['High'].rolling(window=26).max()
            low_26 = df['Low'].rolling(window=26).min()
            kijun = (high_26 + low_26) / 2
            df[col] = ((tenkan + kijun) / 2).shift(26)
        return col
    elif name == 'ich_span_b':
        col = 'ICH_SPAN_B'
        if col not in df.columns:
            high_52 = df['High'].rolling(window=52).max()
            low_52 = df['Low'].rolling(window=52).min()
            df[col] = ((high_52 + low_52) / 2).shift(26)
        return col
    return 'Close'

def evaluate_condition(df, cond: ConditionParam) -> bool:
    if len(df) < 2: return False
    left_col = ensure_indicator_col(df, cond.left)
    right_s0 = df[ensure_indicator_col(df, cond.right)].iloc[-1] if cond.right else cond.right_value
    left_s0 = df[left_col].iloc[-1]
    left_s1 = df[left_col].iloc[-2]
    
    if pd.isna(left_s0) or pd.isna(right_s0): return False
    
    if cond.operator == '>': return left_s0 > right_s0
    if cond.operator == '<': return left_s0 < right_s0
    if cond.operator == 'crossover': 
        right_s1 = df[ensure_indicator_col(df, cond.right)].iloc[-2] if cond.right else cond.right_value
        return (left_s1 <= right_s1) and (left_s0 > right_s0)
    return False

def check_stock_custom(symbol: str, req: CustomScanRequest):
    df = fetch_and_calculate(symbol)
    if df is None: return None
    try:
        for cond in req.conditions:
            if not evaluate_condition(df, cond): return None
        return {"symbol": symbol, "price": round(float(df['Close'].iloc[-1]), 2), "signal": "MATCH"}
    except: return None

@app.post("/api/custom-scan")
async def process_custom_scan(req: CustomScanRequest):
    """Magic Filter now scans ALL 500 stocks!"""
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(check_stock_custom, s, req): s for s in FULL_NSE_500_LIST}
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            if res: results.append(res)
    return {"matches": results}

@app.get("/api/health")
async def health(): return {"status": "running", "stocks_loaded": len(FULL_NSE_500_LIST)}
