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
        
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI_14'] = 100 - (100 / (1 + rs))
        
        ema_12 = df['Close'].ewm(span=12, adjust=False).mean()
        ema_26 = df['Close'].ewm(span=26, adjust=False).mean()
        df['MACD_12_26_9'] = ema_12 - ema_26
        df['MACDs_12_26_9'] = df['MACD_12_26_9'].ewm(span=9, adjust=False).mean()
        df['MACDh_12_26_9'] = df['MACD_12_26_9'] - df['MACDs_12_26_9']

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
        
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        macd = ema12 - ema26
        macd_signal = macd.ewm(span=9, adjust=False).mean()
        macd_hist = macd - macd_signal
        
        last_close = close.iloc[-1]
        prev_close = close.iloc[-2]
        last_vol = volume.iloc[-1]
        last_rsi = rsi.iloc[-1]
        last_ema20 = ema20.iloc[-1]
        last_ema50 = ema50.iloc[-1]
        last_mhist = macd_hist.iloc[-1]
        
        results = []
        for symbol in FULL_NSE_500_LIST:
            tk = f"{symbol}.NS"
            try:
                c = last_close.get(tk)
                if pd.isna(c): continue
                
                pc = prev_close.get(tk)
                change_pct = ((c - pc) / pc) * 100 if pc else 0
                r = last_rsi.get(tk)
                
                sig = "NEUTRAL"
                if not pd.isna(r):
                    if r > 70: sig = "SELL" 
                    elif r < 30: sig = "BUY"
                    
                results.append({
                    "symbol": symbol,
                    "price": float(c),
                    "changePercent": float(change_pct),
                    "rsi": float(r) if not pd.isna(r) else None,
                    "ema20": float(last_ema20.get(tk)) if not pd.isna(last_ema20.get(tk)) else None,
                    "ema50": float(last_ema50.get(tk)) if not pd.isna(last_ema50.get(tk)) else None,
                    "macdHist": float(last_mhist.get(tk)) if not pd.isna(last_mhist.get(tk)) else None,
                    "signal": sig
                })
            except: pass
                
        return {"stocks": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 4. CUSTOM SCREENER & STRATEGY (Updated to use FULL_NSE_500_LIST) ---

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
