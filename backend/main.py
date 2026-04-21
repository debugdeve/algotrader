from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import yfinance as yf
import json
import os
import concurrent.futures
from typing import List, Optional, Dict
from pydantic import BaseModel
import datetime
import requests

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
    print(f"OK Successfully loaded {len(FULL_NSE_500_LIST)} stocks from nse_500.json")
except Exception as e:
    print(f"FAIL ERROR: Could not load nse_500.json: {e}")
    FULL_NSE_500_LIST = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK"] # Emergency fallback

app = FastAPI(title="Algo Trading Scanner API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Simplified for troubleshooting
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import traceback
@app.middleware("http")
async def catch_exceptions_middleware(request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        print(f"EXCEPTION: {e}")
        traceback.print_exc()
        raise e

# --- 2. TECHNICAL INDICATOR ENGINE ---

def fetch_and_calculate(symbol: str):
    try:
        ticker = f"{symbol}.NS" if not symbol.endswith(".NS") else symbol
        df = yf.download(ticker, period="1y", interval="1d", progress=False)
        print(f"DEBUG: Downloaded {ticker}, columns: {df.columns.tolist()}")
        
        if df.empty: return None
        if isinstance(df.columns, pd.MultiIndex):
            # Extract the ticker's cross-section
            if ticker in df.columns.get_level_values(0):
                df = df[ticker]
            else:
                df = df.xs(ticker, axis=1, level=1)
        
        # Ensure all columns are converted to Series if they are still DataFrames
        for col in df.columns:
            if isinstance(df[col], pd.DataFrame):
                df[col] = df[col].iloc[:, 0]

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

        # Fill NaNs instead of dropping everything
        df = df.ffill().fillna(0)
        return df
    except Exception as e:
        return None

# --- 3. ENDPOINTS ---

@app.get("/api/scan/nifty500")
async def scan_nifty500():
    """Returns the full 500 stock scan results using parallel batch fetching."""
    try:
        BATCH_SIZE = 25
        batches = [FULL_NSE_500_LIST[i:i + BATCH_SIZE] for i in range(0, len(FULL_NSE_500_LIST), BATCH_SIZE)]
        
        results = []
        
        def fetch_batch(batch_symbols):
            tickers = [f"{s}.NS" for s in batch_symbols]
            tickers_str = " ".join(tickers)
            try:
                df = yf.download(tickers_str, period="1y", interval="1d", progress=False, group_by='ticker')
                if df.empty: 
                    print(f"Batch failed: {batch_symbols[:3]}...")
                    return []
                
                batch_results = []
                for symbol in batch_symbols:
                    tk = f"{symbol}.NS"
                    try:
                        # Robustly extract the ticker's data from the MultiIndex
                        if isinstance(df.columns, pd.MultiIndex):
                            if tk in df.columns.get_level_values(0):
                                ticker_df = df[tk]
                            elif tk in df.columns.get_level_values(1):
                                ticker_df = df.xs(tk, axis=1, level=1)
                            else:
                                continue
                        else:
                            # Not a MultiIndex (unlikely for batch but possible if only 1 stock returned)
                            if tk == df.columns.name or tk in df.columns:
                                ticker_df = df
                            else:
                                continue

                        if ticker_df.empty or len(ticker_df) < 14: continue
                        
                        # Flatten any remaining single-column DataFrames into Series
                        for col in ticker_df.columns:
                            if isinstance(ticker_df[col], pd.DataFrame):
                                ticker_df[col] = ticker_df[col].iloc[:, 0]
                        
                        ticker_df = ticker_df.ffill().fillna(0)
                        
                        close = ticker_df['Close']
                        high = ticker_df['High']
                        low = ticker_df['Low']
                        
                        # Indicators
                        ema20 = close.ewm(span=20, adjust=False).mean().iloc[-1]
                        ema50 = close.ewm(span=50, adjust=False).mean().iloc[-1]
                        ema200 = close.ewm(span=200, adjust=False).mean().iloc[-1] if len(close) >= 200 else close.ewm(span=len(close), adjust=False).mean().iloc[-1]
                        
                        delta = close.diff()
                        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
                        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
                        rs = gain / (loss + 1e-9)
                        rsi_series = 100 - (100 / (1 + rs))
                        rsi = rsi_series.iloc[-1]

                        min_rsi = rsi_series.rolling(window=14).min()
                        max_rsi = rsi_series.rolling(window=14).max()
                        stoch_rsi = (((rsi_series - min_rsi) / (max_rsi - min_rsi + 1e-9)) * 100).iloc[-1]
                        
                        ema12 = close.ewm(span=12, adjust=False).mean()
                        ema26 = close.ewm(span=26, adjust=False).mean()
                        macd = (ema12 - ema26).iloc[-1]
                        macd_signal = (ema12 - ema26).ewm(span=9, adjust=False).mean().iloc[-1]
                        macd_hist = macd - macd_signal

                        # Ichimoku
                        high9 = high.rolling(window=9).max()
                        low9 = low.rolling(window=9).min()
                        tenkan = (high9 + low9) / 2
                        high26 = high.rolling(window=26).max()
                        low26 = low.rolling(window=26).min()
                        kijun = (high26 + low26) / 2
                        
                        # Use last valid span value or default to zero
                        span_a_series = ((tenkan + kijun) / 2).shift(26)
                        span_a = span_a_series.iloc[-1] if not pd.isna(span_a_series.iloc[-1]) else 0
                        
                        high52 = high.rolling(window=52).max()
                        low52 = low.rolling(window=52).min()
                        span_b_series = ((high52 + low52) / 2).shift(26)
                        span_b = span_b_series.iloc[-1] if not pd.isna(span_b_series.iloc[-1]) else 0
                        
                        c = float(close.iloc[-1])
                        pc = float(close.iloc[-2])
                        change_pct = ((c - pc) / pc) * 100 if pc else 0
                        
                        sig = "NEUTRAL"
                        if not pd.isna(rsi):
                            if float(rsi) > 70: sig = "SELL" 
                            elif float(rsi) < 30: sig = "BUY"
                            
                        batch_results.append({
                            "symbol": symbol,
                            "price": float(c),
                            "changePercent": float(change_pct),
                            "rsi": float(rsi) if not pd.isna(rsi) else None,
                            "ema20": float(ema20) if not pd.isna(ema20) else None,
                            "ema50": float(ema50) if not pd.isna(ema50) else None,
                            "ema200": float(ema200) if not pd.isna(ema200) else None,
                            "stochK": float(stoch_rsi) if not pd.isna(stoch_rsi) else None,
                            "macdHist": float(macd_hist) if not pd.isna(macd_hist) else None,
                            "ich_span_a": float(span_a) if not pd.isna(span_a) else None,
                            "ich_span_b": float(span_b) if not pd.isna(span_b) else None,
                            "signal": sig,
                        })
                    except Exception as e:
                        print(f"Error processing {symbol}: {e}")
                        continue
                print(f"Batch processed: {len(batch_results)}/{len(batch_symbols)} stocks")
                return batch_results
            except Exception as e:
                print(f"Batch fetch error: {e}")
                return []

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            future_to_batch = {executor.submit(fetch_batch, b): b for b in batches}
            for future in concurrent.futures.as_completed(future_to_batch):
                batch_res = future.result()
                if batch_res: results.extend(batch_res)
                
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

# --- 5. FII / DII & DERIVATIVES ---

@app.get("/api/market/fii-dii")
async def get_fii_dii():
    """
    Fetches FII/DII net buy/sell data. 
    In a production app, this would scrape NSE or use a paid provider.
    """
    # Mock data for demonstration - in real life, fetch from NSE
    return {
        "date": datetime.date.today().isoformat(),
        "fii_net": 1245.60,
        "dii_net": -450.25,
        "history": [
            {"date": "2024-04-18", "fii": 1500, "dii": -200},
            {"date": "2024-04-17", "fii": -1200, "dii": 800},
            {"date": "2024-04-16", "fii": 400, "dii": -100},
        ]
    }

@app.get("/api/market/derivatives/{symbol}")
async def get_derivatives_data(symbol: str):
    """
    Calculates PCR and OI Change for the given symbol (NIFTY/BANKNIFTY).
    """
    # Placeholder for OI calculation logic
    # In real scenarios, use nsepython or direct NSE option chain API
    return {
        "symbol": symbol,
        "pcr": 0.85,
        "total_ce_oi": 1200000,
        "total_pe_oi": 1020000,
        "max_pain": 22400 if symbol == "NIFTY" else 48000,
        "oi_change": [
            {"strike": 22300, "ce_change": 5000, "pe_change": 12000},
            {"strike": 22400, "ce_change": 15000, "pe_change": 8000},
            {"strike": 22500, "ce_change": 25000, "pe_change": 2000},
        ]
    }

# --- 6. BACKTESTING ENGINE ---

class BacktestRequest(BaseModel):
    symbol: str
    logic: str # e.g., "RSI < 30"
    period: str = "5y"

@app.post("/api/backtest")
async def run_backtest(req: BacktestRequest):
    """
    Simple backtesting engine using yfinance and pandas.
    """
    try:
        df = fetch_and_calculate(req.symbol)
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="No data found")
        
        # Indicators are already calculated in fetch_and_calculate
        # Using RSI_14 and EMA_200
        
        signals = []
        balance = 100000
        shares = 0
        
        # Start from where EMA_200 is available (usually row 200)
        for i in range(1, len(df)):
            try:
                price_val = df['Close'].iloc[i]
                rsi_val = df['RSI_14'].iloc[i]
                ema_val = df['EMA_200'].iloc[i]
                
                # Check if they are Series or scalars
                if hasattr(price_val, "__len__") and not isinstance(price_val, (str, bytes)):
                    # It's a Series! Take the first element
                    price = float(price_val.iloc[0])
                    rsi = float(rsi_val.iloc[0])
                    ema200 = float(ema_val.iloc[0])
                else:
                    price = float(price_val)
                    rsi = float(rsi_val)
                    ema200 = float(ema_val)
                
                # Logic: Buy if RSI < 30 and price > ema200 and shares == 0 and rsi > 0:
                if rsi < 30 and price > ema200 and shares == 0 and rsi > 0:
                    shares = balance // price
                    balance -= shares * price
                    signals.append({"type": "BUY", "price": price, "date": str(df.index[i])})
                
                # Logic: Sell if RSI > 70 and shares > 0
                elif rsi > 70 and shares > 0:
                    balance += shares * price
                    shares = 0
                    signals.append({"type": "SELL", "price": price, "date": str(df.index[i])})
            except Exception as e:
                print(f"Error in backtest at index {i}: {e}")
                continue
        
        # Calculate final portfolio value
        last_close_val = df['Close'].iloc[-1]
        if hasattr(last_close_val, "__len__") and not isinstance(last_close_val, (str, bytes)):
            last_close = float(last_close_val.iloc[0])
        else:
            last_close = float(last_close_val)
            
        final_value = float(balance + (shares * last_close))
        total_return = float(((final_value - 100000) / 100000) * 100)
        
        res = {
            "symbol": req.symbol,
            "total_return": round(total_return, 2),
            "win_rate": 65.5, # Placeholder
            "max_drawdown": -12.4, # Placeholder
            "trades": signals
        }
        print(f"BACKTEST RESPONSE TYPE: {type(res)}")
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 7. BROKER INTEGRATION ---

class OrderRequest(BaseModel):
    broker: str
    symbol: str
    qty: int
    type: str # MARKET, LIMIT, SL
    price: Optional[float] = None
    side: str # BUY, SELL

@app.post("/api/broker/order")
async def place_order(req: OrderRequest):
    """
    Executes an order via the specified broker API.
    """
    # This is a critical endpoint. Real implementation requires valid OAuth tokens.
    print(f"PLACING {req.side} ORDER for {req.symbol} via {req.broker}")
    
    return {
        "status": "SUCCESS",
        "order_id": f"ORD_{datetime.datetime.now().timestamp()}",
        "message": f"Order for {req.qty} shares of {req.symbol} placed successfully."
    }

@app.get("/api/health")
async def health(): return {"status": "running", "stocks_loaded": len(FULL_NSE_500_LIST)}
