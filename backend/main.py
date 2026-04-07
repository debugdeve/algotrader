from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import yfinance as yf
import json
import os

# Load Market Cap Mapping
MARKET_CAP_PATH = os.path.join(os.path.dirname(__file__), "market_caps.json")
try:
    with open(MARKET_CAP_PATH, "r") as f:
        CAP_DATA = json.load(f)
except Exception:
    CAP_DATA = {"LARGE_CAPS": [], "MID_CAPS": []}

app = FastAPI(title="Algo Trading Scanner API")

# Allow your Next.js frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173", 
        "http://localhost:4173",
        "https://algotrader-pro-six.vercel.app"
    ], # Allowing Vite dev servers and production Vercel domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "algo-trading-backend"}

def fetch_and_calculate(symbol: str):
    """
    Fetches OHLCV data and calculates technical indicators (Native Pandas).
    """
    try:
        # 1. Fetch Data
        ticker = f"{symbol}.NS" if not symbol.endswith(".NS") else symbol
        df = yf.download(ticker, period="3mo", interval="1d", progress=False)
        
        if df.empty:
            raise ValueError("No data found for symbol.")

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        # 2. Native Calculations replacing pandas_ta 
        # EMA
        df['EMA_20'] = df['Close'].ewm(span=20, adjust=False).mean()
        df['EMA_50'] = df['Close'].ewm(span=50, adjust=False).mean()
        
        # RSI 14
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI_14'] = 100 - (100 / (1 + rs))
        
        # MACD (12, 26, 9)
        ema_12 = df['Close'].ewm(span=12, adjust=False).mean()
        ema_26 = df['Close'].ewm(span=26, adjust=False).mean()
        df['MACD_12_26_9'] = ema_12 - ema_26
        df['MACDs_12_26_9'] = df['MACD_12_26_9'].ewm(span=9, adjust=False).mean()
        df['MACDh_12_26_9'] = df['MACD_12_26_9'] - df['MACDs_12_26_9']

        # Drop rows with NaN values
        df.dropna(inplace=True)

        return df

    except Exception as e:
        print(f"Error processing {symbol}: {e}")
        return None

@app.get("/api/scan/nifty500")
async def scan_nifty500():
    """
    Mass-Vectorized Data Endpoint.
    Downloads the entire NIFTY 500 universe concurrently through yfinance.
    Computes indicators natively across the Pandas Multi-Index dataframe.
    """
    try:
        with open("nse_500.json", "r") as f:
            symbols = json.load(f)
            
        tickers = [f"{s}.NS" for s in symbols]
        tickers_str = " ".join(tickers)
        
        # 1. Vectorized Download (Requires roughly 10-15 seconds)
        df = yf.download(tickers_str, period="3mo", interval="1d", progress=False)
        
        # 2. Extract Cross-sectional Series
        close = df['Close']
        volume = df['Volume']
        
        # 3. Vectorized Math (Computes 500 streams simultaneously)
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
        
        # 4. Extract Last Row
        last_close = close.iloc[-1]
        prev_close = close.iloc[-2]
        last_vol = volume.iloc[-1]
        last_rsi = rsi.iloc[-1]
        last_ema20 = ema20.iloc[-1]
        last_ema50 = ema50.iloc[-1]
        last_macd = macd.iloc[-1]
        last_msig = macd_signal.iloc[-1]
        last_mhist = macd_hist.iloc[-1]
        
        results = []
        for symbol in symbols:
            tk = f"{symbol}.NS"
            try:
                # Handle delisted/failing tickers safely
                c = last_close.get(tk)
                if pd.isna(c): continue
                
                pc = prev_close.get(tk)
                change = c - pc
                change_pct = (change / pc) * 100 if pc else 0
                
                r = last_rsi.get(tk)
                e2 = last_ema20.get(tk)
                e5 = last_ema50.get(tk)
                m = last_macd.get(tk)
                ms = last_msig.get(tk)
                mh = last_mhist.get(tk)
                
                sig = "NEUTRAL"
                if not pd.isna(r):
                    if r > 70: sig = "SELL" 
                    elif r < 30: sig = "BUY"
                    
                results.append({
                    "symbol": symbol,
                    "price": float(c),
                    "changePercent": float(change_pct),
                    "volume": float(last_vol.get(tk, 0)) if not pd.isna(last_vol.get(tk)) else 0,
                    "rsi": float(r) if not pd.isna(r) else None,
                    "ema20": float(e2) if not pd.isna(e2) else None,
                    "ema50": float(e5) if not pd.isna(e5) else None,
                    "macdLine": float(m) if not pd.isna(m) else None,
                    "macdSignal": float(ms) if not pd.isna(ms) else None,
                    "macdHist": float(mh) if not pd.isna(mh) else None,
                    "signal": sig,
                    "isLive": True
                })
            except Exception as e:
                pass
                
        return {"stocks": results}
        
    except Exception as e:
        print("Scraping Multi-Index Error:", e)
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
        "macd": round(float(latest_data['MACD_12_26_9']), 2),
        "macd_signal": round(float(latest_data['MACDs_12_26_9']), 2),
        "macd_histogram": round(float(latest_data['MACDh_12_26_9']), 2),
        "ema_20": round(float(latest_data['EMA_20']), 2),
        "ema_50": round(float(latest_data['EMA_50']), 2),
        "signal": "OVERBOUGHT" if latest_data['RSI_14'] > 70 else ("OVERSOLD" if latest_data['RSI_14'] < 30 else "NEUTRAL")
    }
    
    return response

# --- Custom Screener Implementation ---
from typing import List, Optional
from pydantic import BaseModel
import concurrent.futures

class IndicatorParam(BaseModel):
    name: str # e.g. 'close', 'sma', 'ema', 'rsi', 'macd', 'volume'
    period: Optional[int] = None
    
class ConditionParam(BaseModel):
    left: IndicatorParam
    operator: str # '>', '<', '==', 'crossover', 'crossunder'
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

# Global state to prevent infinite looping of automated trades.
# Stores strings like "BUY_RELIANCE" or "SELL_TCS"
EXECUTED_TRADES = set()

# Mocking NSE Universe and User's dummy portfolio
NIFTY_MOCK_UNIVERSE = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN", "BHARTIARTL", "ITC", "KOTAKBANK", "L&T"
]
MOCK_PORTFOLIO = [
    "RELIANCE", "INFY", "ITC", "TATAMOTORS"
]

# Hardcoded NSE stocks list for the scanner backend
NSE_STOCKS_LIST = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'HINDUNILVR', 'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK',
  'LT', 'AXISBANK', 'ASIANPAINT', 'MARUTI', 'SUNPHARMA'
]

def ensure_indicator_col(df, ind: IndicatorParam) -> str:
    name = ind.name.lower()
    if name == 'close': return 'Close'
    if name == 'open': return 'Open'
    if name == 'volume': return 'Volume'
    
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
            rs = gain / loss
            df[col] = 100 - (100 / (1 + rs))
        return col
    elif name == 'macd':
        col = 'MACD_12_26_9'
        if col not in df.columns:
            ema12 = df['Close'].ewm(span=12, adjust=False).mean()
            ema26 = df['Close'].ewm(span=26, adjust=False).mean()
            df[col] = ema12 - ema26
        return col
    return 'Close'

def evaluate_condition(df, cond: ConditionParam) -> bool:
    if len(df) < 2: return False
    
    left_col = ensure_indicator_col(df, cond.left)
    
    # get right series or constant
    if cond.right is not None:
        right_col = ensure_indicator_col(df, cond.right)
        right_s0 = df[right_col].iloc[-1]
        right_s1 = df[right_col].iloc[-2]
    else:
        right_s0 = cond.right_value
        right_s1 = cond.right_value
        
    left_s0 = df[left_col].iloc[-1]
    left_s1 = df[left_col].iloc[-2]
    
    # prevent NaNs
    if pd.isna(left_s0) or pd.isna(right_s0): return False
    
    op = cond.operator
    if op == '>': return left_s0 > right_s0
    elif op == '<': return left_s0 < right_s0
    elif op == '==': return left_s0 == right_s0
    elif op == 'crossover': return (left_s1 <= right_s1) and (left_s0 > right_s0)
    elif op == 'crossunder': return (left_s1 >= right_s1) and (left_s0 < right_s0)
    return False

def check_stock_custom(symbol: str, req: CustomScanRequest):
    ticker = f"{symbol}.NS" if not symbol.endswith(".NS") else symbol
    df = yf.download(ticker, period="6mo", interval="1d", progress=False)
    if df.empty: return None
    if isinstance(df.columns, pd.MultiIndex): df.columns = df.columns.get_level_values(0)
    
    try:
        match = True
        for cond in req.conditions:
            if not evaluate_condition(df, cond):
                match = False
                break
                
        if match:
            return {
                "symbol": symbol,
                "price": round(float(df['Close'].iloc[-1]), 2),
                "volume": int(df['Volume'].iloc[-1])
            }
    except Exception as e:
        print(f"Error evaluating {symbol}: {e}")
    return None

@app.post("/api/custom-scan")
async def process_custom_scan(req: CustomScanRequest):
    results = []
    # threadpool to speed up yf downloads
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(check_stock_custom, s, req): s for s in NSE_STOCKS_LIST}
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            if res:
                results.append(res)
                
    return {"matches": results}

@app.post("/api/execute-strategy")
async def execute_strategy(req: DualStrategyRequest):
    """
    Simultaneous Dual Strategy Execution Engine.
    Executes BUY logic against the open market and SELL logic against the existing portfolio.
    """
    matches = []
    
    # helper struct for check_stock_custom
    class DummyReq:
        def __init__(self, c):
            self.conditions = c
            
    def get_cap_priority(symbol: str) -> int:
        if symbol in CAP_DATA.get("MID_CAPS", []): return 1 # Mid Cap = Priority 1
        if symbol in CAP_DATA.get("LARGE_CAPS", []): return 2 # Large Cap = Priority 2
        return 3 # Small Cap = Priority 3

    def process_leg(action_type, check_universe, conditions, initial_allocation=0):
        if not conditions: return
        dummy_req = DummyReq(conditions)
        
        # Step 1: Scan for signals (Parallel)
        triggered_signals = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(check_stock_custom, sym, dummy_req): sym for sym in check_universe}
            for future in concurrent.futures.as_completed(futures):
                res = future.result()
                if res: triggered_signals.append(res)

        if not triggered_signals: return

        # Step 2: Priority Sorting (Option C: Cap Tier -> Relative Strength/Price)
        # We use RSI or Price as a proxy for 'Relative Strength' if RSI isn't pre-calculated here.
        # Sorting by Cap Priority ascending (1, 2, 3) and Price descending for momentum.
        triggered_signals.sort(key=lambda x: (get_cap_priority(x["symbol"]), -x["price"]))

        # Step 3: Sequential Execution (Greedy Allocation)
        remaining_balance = initial_allocation
        
        for res in triggered_signals:
            symbol = res["symbol"]
            trade_key = f"{action_type}_{symbol}"
            
            if trade_key in EXECUTED_TRADES: continue
                
            # Quantity Calculation
            if action_type == "BUY":
                if req.greedy_mode:
                    # Greedy: Use MAX possible with remaining funds
                    qty = int(remaining_balance / max(1, res["price"]))
                else:
                    # Fixed Allocation Mode
                    qty = int(initial_allocation / max(1, res["price"]))
            else:
                # Sell logic (fixed or portfolio balance)
                qty = 10 

            if qty > 0:
                cost = qty * res["price"]
                if action_type == "BUY" and cost > remaining_balance and req.greedy_mode:
                    # In Greedy Mode, if we can't afford the calculated qty, we skip entirely (User Rule 2)
                    print(f"[{req.broker}] SKIPPED: {symbol} (Insufficient Funds ₹{cost} > ₹{remaining_balance})")
                    continue

                EXECUTED_TRADES.add(trade_key)
                print(f"[{req.broker}] SUCCESS: {action_type} {qty} shares of {symbol} at ₹{res['price']}.")
                
                if action_type == "BUY" and req.greedy_mode:
                    remaining_balance -= cost
                    print(f"[{req.broker}] BALANCE REMAINING: ₹{remaining_balance:.2f}")

                matches.append({
                    "symbol": symbol,
                    "price": res["price"],
                    "volume": res["volume"],
                    "trade_status": "EXECUTED",
                    "trade_action": action_type,
                    "trade_qty": qty,
                    "cap_group": "MID" if get_cap_priority(symbol) == 1 else "LARGE" if get_cap_priority(symbol) == 2 else "SMALL",
                    "broker": req.broker
                })

    try:
        # Phase 1: SELL (Optional, greedy doesn't apply to sells usually)
        if req.sell_enabled:
            process_leg("SELL", MOCK_PORTFOLIO, req.sell_conditions, 0)
            
        # Phase 2: BUY (Greedy Priority Execution)
        if req.buy_enabled:
            # If greedy_mode is on, we would ideally fetch real 'buy_allocation' from broker balance here.
            process_leg("BUY", NIFTY_MOCK_UNIVERSE, req.buy_conditions, req.buy_allocation)
            
    except Exception as general_err:
        raise HTTPException(status_code=500, detail=str(general_err))
        
    return {"matches": matches}

# In a real environment, you would instantiate KiteConnect:
# from kiteconnect import KiteConnect
# kite = KiteConnect(api_key="your_api_key")

from pydantic import BaseModel

class SessionRequest(BaseModel):
    request_token: str
    api_key: str
    api_secret: str

class OrderRequest(BaseModel):
    tradingsymbol: str
    exchange: str
    transaction_type: str
    quantity: int
    price: float = 0
    order_type: str
    product: str
    validity: str
    broker: str = "ZERODHA" # Default to Zerodha for backward compatibility

class BreezeSessionRequest(BaseModel):
    api_key: str
    api_secret: str
    session_token: str

# Mock Session Storage (In Memory)
active_sessions = {}

@app.get("/api/kite/login")
async def get_kite_login(api_key: str):
    """
    Returns the official Kite Connect login URL.
    """
    if not api_key:
        raise HTTPException(status_code=400, detail="API Key is required")
    # Real URL generation: return {"login_url": kite.login_url()}
    login_url = f"https://kite.zerodha.com/connect/login?v=3&api_key={api_key}"
    return {"status": "success", "login_url": login_url}

@app.post("/api/kite/session")
async def create_kite_session(req: SessionRequest):
    """
    Exchanges the request_token from the login redirect for a permanent access_token.
    """
    # Real logic:
    # kite = KiteConnect(api_key=req.api_key)
    # data = kite.generate_session(req.request_token, api_secret=req.api_secret)
    # access_token = data["access_token"]
    
    # Mocking the session generation:
    import time
    time.sleep(1) # Simulate network call
    
    if len(req.request_token) < 5:
        raise HTTPException(status_code=400, detail="Invalid request token")

    access_token = f"mock_access_token_{int(time.time())}"
    active_sessions[access_token] = {
        "api_key": req.api_key,
        "user_name": "DEMO USER",
        "broker": "ZERODHA"
    }
    
    return {
        "status": "success", 
        "access_token": access_token,
        "user": active_sessions[access_token]
    }

@app.get("/api/kite/portfolio")
async def get_kite_portfolio():
    """
    Returns current holdings / open positions.
    """
    # Real logic: 
    # kite.set_access_token(access_token)
    # holdings = kite.holdings()
    
    # Mock Holdings matching the previous mockData.js structure
    holdings = [
        {"symbol": "RELIANCE", "qty": 45, "avgPrice": 2450.50, "currentPrice": 2980.25},
        {"symbol": "TCS", "qty": 20, "avgPrice": 3200.00, "currentPrice": 4120.75},
        {"symbol": "HDFCBANK", "qty": 150, "avgPrice": 1550.25, "currentPrice": 1430.50},
        {"symbol": "INFY", "qty": 60, "avgPrice": 1420.80, "currentPrice": 1680.10},
        {"symbol": "ICICIBANK", "qty": 100, "avgPrice": 920.40, "currentPrice": 1080.35},
        {"symbol": "SBIN", "qty": 250, "avgPrice": 540.60, "currentPrice": 750.80},
    ]
    
    return {"status": "success", "data": holdings}

@app.post("/api/kite/order")
async def place_kite_order(order: OrderRequest):
    """
    Places an order on Zerodha Kite.
    """
    import random
    
    # Simulated Network latency
    import time
    time.sleep(0.5)

    order_id = f"KT{random.randint(100000000, 999999999)}"
    
    order_data = {
        "id": order_id,
        "symbol": order.tradingsymbol,
        "type": order.transaction_type,
        "qty": order.quantity,
        "price": order.price if order.order_type != 'MARKET' else 'MKT',
        "orderType": order.order_type,
        "product": order.product,
        "status": "COMPLETE" if order.order_type == 'MARKET' else "OPEN",
        "time": time.strftime("%H:%M:%S"),
        "exchange": order.exchange
    }
    
    return {
        "status": "success",
        "data": {"order_id": order_id},
        "order": order_data
    }

# --- ICICI Direct Breeze Integration (Mocked) ---

@app.get("/api/breeze/login")
async def get_breeze_login(api_key: str):
    """
    Returns the Breeze login URL.
    """
    if not api_key:
        raise HTTPException(status_code=400, detail="API Key is required")
    # Real URL: https://api.icicidirect.com/apiuser/login?api_key={api_key}
    login_url = f"https://api.icicidirect.com/apiuser/login?api_key={api_key}"
    return {"status": "success", "login_url": login_url}

@app.post("/api/breeze/session")
async def create_breeze_session(req: BreezeSessionRequest):
    """
    Initializes a Breeze session.
    """
    import time
    time.sleep(1) # Simulate network call

    if len(req.session_token) < 5:
        raise HTTPException(status_code=400, detail="Invalid session token")

    access_token = f"breeze_session_{int(time.time())}"
    active_sessions[access_token] = {
        "api_key": req.api_key,
        "user_name": "ICICI TRADER",
        "broker": "ICICI_BREEZE"
    }

    return {
        "status": "success",
        "access_token": access_token,
        "user": active_sessions[access_token]
    }

@app.get("/api/breeze/portfolio")
async def get_breeze_portfolio():
    """
    Returns simulated Breeze holdings.
    """
    holdings = [
        {"symbol": "TATASTEEL", "qty": 100, "avgPrice": 120.50, "currentPrice": 155.25},
        {"symbol": "ITC", "qty": 500, "avgPrice": 410.00, "currentPrice": 425.75},
        {"symbol": "SBIN", "qty": 100, "avgPrice": 600.25, "currentPrice": 750.80},
    ]
    return {"status": "success", "data": holdings}

@app.post("/api/breeze/order")
async def place_breeze_order(order: OrderRequest):
    """
    Places an order on ICICI Breeze.
    """
    import random, time
    time.sleep(0.5)

    order_id = f"BR{random.randint(100000000, 999999999)}"
    
    order_data = {
        "id": order_id,
        "symbol": order.tradingsymbol,
        "type": order.transaction_type,
        "qty": order.quantity,
        "price": order.price if order.order_type != 'MARKET' else 'MKT',
        "status": "COMPLETE",
        "time": time.strftime("%H:%M:%S"),
        "exchange": order.exchange,
        "broker": "ICICI_BREEZE"
    }

    return {
        "status": "success",
        "data": {"order_id": order_id},
        "order": order_data
    }
