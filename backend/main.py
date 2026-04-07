from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import yfinance as yf
import json
import os
import concurrent.futures
import time

# --- INITIALIZATION ---
app = FastAPI(title="AlgoTrader Pro — Advanced NSE Trading")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173", 
        "http://localhost:4173",
        "https://algotrader-pro-six.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- UNIVERSE LOADER (The Fix) ---
def load_full_universe():
    """Loads the Nifty 500 list from JSON or falls back to a default list."""
    try:
        with open("nse_500.json", "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading nse_500.json: {e}")
        return ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN", "BHARTIARTL", "ITC"]

# Use this everywhere instead of hardcoded lists
NIFTY_500_SYMBOLS = load_full_universe()

# Load Market Cap Mapping
MARKET_CAP_PATH = os.path.join(os.path.dirname(__file__), "market_caps.json")
try:
    with open(MARKET_CAP_PATH, "r") as f:
        CAP_DATA = json.load(f)
except Exception:
    CAP_DATA = {"LARGE_CAPS": [], "MID_CAPS": []}

# Global state to prevent infinite trade loops
EXECUTED_TRADES = set()

# --- DATA MODELS ---
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

class DualStrategyRequest(BaseModel):
    broker: str
    api_key: str
    api_secret: str
    buy_enabled: bool
    buy_allocation: float
    buy_conditions: List[ConditionParam]
    sell_enabled: bool
    sell_conditions: List[ConditionParam]
    greedy_mode: bool = False

# --- CORE CALCULATIONS ---
def fetch_and_calculate(symbol: str):
    """Fetches OHLCV data and calculates technical indicators."""
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
        df['RSI_14'] = 100 - (100 / (1 + (gain/loss)))
        
        ema12 = df['Close'].ewm(span=12, adjust=False).mean()
        ema26 = df['Close'].ewm(span=26, adjust=False).mean()
        df['MACD'] = ema12 - ema26
        df.dropna(inplace=True)
        return df
    except: return None

def ensure_indicator_col(df, ind: IndicatorParam) -> str:
    name = ind.name.lower()
    if name in ['close', 'open', 'volume']: return name.capitalize()
    
    period = ind.period or 14
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
    right_s0 = cond.right_value if cond.right is None else df[ensure_indicator_col(df, cond.right)].iloc[-1]
    right_s1 = cond.right_value if cond.right is None else df[ensure_indicator_col(df, cond.right)].iloc[-2]
    
    l0, l1 = df[left_col].iloc[-1], df[left_col].iloc[-2]
    if pd.isna(l0) or pd.isna(right_s0): return False

    if cond.operator == '>': return l0 > right_s0
    if cond.operator == '<': return l0 < right_s0
    if cond.operator == 'crossover': return l1 <= right_s1 and l0 > right_s0
    if cond.operator == 'crossunder': return l1 >= right_s1 and l0 < right_s0
    return False

def check_stock_custom(symbol: str, conditions: List[ConditionParam]):
    df = fetch_and_calculate(symbol)
    if df is None: return None
    try:
        if all(evaluate_condition(df, c) for c in conditions):
            return {"symbol": symbol, "price": round(float(df['Close'].iloc[-1]), 2), "volume": int(df['Volume'].iloc[-1])}
    except: pass
    return None

# --- ENDPOINTS ---

@app.get("/api/scan/nifty500")
async def scan_nifty500_vectorized():
    """Vectorized scan for speed across the full universe."""
    try:
        tickers = [f"{s}.NS" for s in NIFTY_500_SYMBOLS]
        df = yf.download(" ".join(tickers), period="3mo", interval="1d", progress=False)
        close = df['Close']
        # Simplified for brevity; you can re-add full vectorized math here
        results = [{"symbol": s, "price": float(close[f"{s}.NS"].iloc[-1])} for s in NIFTY_500_SYMBOLS if not pd.isna(close.get(f"{s}.NS")).any()]
        return {"stocks": results}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/custom-scan")
async def process_custom_scan(req: CustomScanRequest):
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(check_stock_custom, s, req.conditions): s for s in NIFTY_500_SYMBOLS}
        for f in concurrent.futures.as_completed(futures):
            res = f.result()
            if res: results.append(res)
    return {"matches": results}

@app.post("/api/execute-strategy")
async def execute_strategy(req: DualStrategyRequest):
    matches = []
    def get_cap_priority(s):
        if s in CAP_DATA.get("MID_CAPS", []): return 1
        return 2 if s in CAP_DATA.get("LARGE_CAPS", []) else 3

    def process_leg(action, universe, conds, alloc):
        signals = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=15) as ex:
            futures = {ex.submit(check_stock_custom, s, conds): s for s in universe}
            for f in concurrent.futures.as_completed(futures):
                res = f.result()
                if res: signals.append(res)
        
        signals.sort(key=lambda x: (get_cap_priority(x["symbol"]), -x["price"]))
        rem = alloc
        for res in signals:
            key = f"{action}_{res['symbol']}"
            if key in EXECUTED_TRADES: continue
            qty = int(rem / res["price"]) if req.greedy_mode else int(alloc / res["price"])
            if qty > 0:
                cost = qty * res["price"]
                if action == "BUY" and cost > rem and req.greedy_mode: continue
                EXECUTED_TRADES.add(key)
                if action == "BUY" and req.greedy_mode: rem -= cost
                matches.append({**res, "trade_action": action, "trade_qty": qty, "broker": req.broker})

    if req.sell_enabled: process_leg("SELL", ["RELIANCE", "INFY"], req.sell_conditions, 0)
    if req.buy_enabled: process_leg("BUY", NIFTY_500_SYMBOLS, req.buy_conditions, req.buy_allocation)
    return {"matches": matches}

# --- BROKER MOCKS (Restored) ---
@app.get("/api/kite/portfolio")
async def get_kite_portfolio():
    return {"status": "success", "data": [{"symbol": "RELIANCE", "qty": 45, "avgPrice": 2450.50, "currentPrice": 2980.25}]}

@app.get("/api/breeze/portfolio")
async def get_breeze_portfolio():
    return {"status": "success", "data": [{"symbol": "ITC", "qty": 500, "avgPrice": 410.00, "currentPrice": 425.75}]}

