from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from backend.database import get_session
from backend.models import StockDailyStat

router = APIRouter(prefix="/stocks", tags=["stocks"])

# This will be populated from main.py or we can move the cache here
STOCKS_CACHE = []

@router.get("/search")
async def search_stocks(q: str):
    if not q:
        return []
    
    q = q.upper()
    results = [
        s for s in STOCKS_CACHE 
        if q in s["symbol"].upper() or q in s["name"].upper()
    ]
    return results[:10]

@router.get("/price/{symbol}")
def get_stock_price(symbol: str):
    try:
        ticker = yf.Ticker(symbol)
        price = ticker.fast_info.get('last_price')
        if price is None:
            hist = ticker.history(period="1d")
            if not hist.empty:
                price = hist['Close'].iloc[-1]
        
        if price is not None:
            return {"symbol": symbol, "price": round(float(price), 2)}
        else:
            raise HTTPException(status_code=404, detail="Price not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/prices/")
async def get_stock_prices(symbols: List[str]):
    results = {}
    try:
        tickers = yf.Tickers(" ".join(symbols))
        for symbol in symbols:
            ticker = tickers.tickers[symbol]
            price = ticker.fast_info.get('last_price')
            if price is None:
                hist = ticker.history(period="1d")
                if not hist.empty:
                    price = hist['Close'].iloc[-1]
            
            results[symbol] = round(float(price), 2) if price is not None else None
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/{symbol}")
async def get_stock_stats(symbol: str):
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="30d")
        if hist.empty:
            raise HTTPException(status_code=404, detail="No historical data found")
        
        hist['HL'] = hist['High'] - hist['Low']
        hist['HCp'] = abs(hist['High'] - hist['Close'].shift(1))
        hist['LCp'] = abs(hist['Low'] - hist['Close'].shift(1))
        hist['TR'] = hist[['HL', 'HCp', 'LCp']].max(axis=1)
        
        atr_period = 14
        atr = hist['TR'].rolling(window=atr_period).mean().iloc[-1]
        
        last_item = hist.iloc[-1]
        prev_item = hist.iloc[-2] if len(hist) > 1 else last_item
        
        change = last_item['Close'] - prev_item['Close']
        change_percent = (change / prev_item['Close'] * 100) if prev_item['Close'] != 0 else 0
        
        return {
            "symbol": symbol,
            "price": round(float(last_item['Close']), 2),
            "change": round(float(change), 2),
            "change_percent": round(float(change_percent), 2),
            "volume": int(last_item['Volume']),
            "atr": round(float(atr), 2) if not pd.isna(atr) else None,
            "high": round(float(last_item['High']), 2),
            "low": round(float(last_item['Low']), 2),
            "open": round(float(last_item['Open']), 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stats/record", response_model=StockDailyStat)
async def record_stock_stats(stat: StockDailyStat, session: Session = Depends(get_session)):
    try:
        if isinstance(stat.date, str):
            stat.date = datetime.fromisoformat(stat.date.replace('Z', '+00:00'))
        
        session.add(stat)
        session.commit()
        session.refresh(stat)
        return stat
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/candles/{symbol}")
async def get_stock_candles(symbol: str, period: str = "60d", interval: str = "1d"):
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period, interval=interval)
        if hist.empty:
            raise HTTPException(status_code=404, detail="No candle data found")
        
        candles = []
        for date, row in hist.iterrows():
            candles.append({
                "date": date.isoformat(),
                "open": round(float(row['Open']), 2),
                "high": round(float(row['High']), 2),
                "low": round(float(row['Low']), 2),
                "close": round(float(row['Close']), 2),
                "volume": int(row['Volume'])
            })
        return candles
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{symbol}", response_model=List[StockDailyStat])
async def get_stock_history(symbol: str, session: Session = Depends(get_session)):
    stats = session.exec(
        select(StockDailyStat)
        .where(StockDailyStat.symbol == symbol)
        .order_by(StockDailyStat.date.asc())
    ).all()
    return stats

@router.get("/simulation/1m/{symbol}")
async def get_simulated_1m_candles(symbol: str):
    try:
        # Fetch 1 year of 1-hour data as the baseline macro trend
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="1y", interval="1h")
        if hist.empty:
            raise HTTPException(status_code=404, detail="No base data found for simulation")
        
        simulated_candles = []
        
        # Extrapolate 60 1-minute candles for each 1-hour candle
        for date, row in hist.iterrows():
            hour_open = float(row['Open'])
            hour_high = float(row['High'])
            hour_low = float(row['Low'])
            hour_close = float(row['Close'])
            hour_vol = int(row['Volume'])
            
            # Simple linear interpolation with random walk bounded by H/L
            # This is a basic simulation for testing purposes
            steps = 60
            base_vol = hour_vol // steps
            
            # Generate 60 steps traversing from Open to Close
            price_path = np.linspace(hour_open, hour_close, steps)
            
            # Add synthetic noise within the bounds
            noise_amplitude = (hour_high - hour_low) * 0.2
            noise = np.random.normal(0, noise_amplitude, steps)
            
            # Ensure start and end perfectly match the hourly candle
            noisy_path = price_path + noise
            noisy_path[0] = hour_open
            noisy_path[-1] = hour_close
            
            # Clamp to High/Low
            noisy_path = np.clip(noisy_path, hour_low, hour_high)
            
            for i in range(steps):
                current_time = date + timedelta(minutes=i)
                
                # Derive synthetic OHLC for the minute
                m_open = noisy_path[i] if i == 0 else m_close # type: ignore
                m_close = noisy_path[i]
                
                # Add slight wick noise
                m_high = min(hour_high, max(m_open, m_close) + abs(np.random.normal(0, noise_amplitude * 0.5)))
                m_low = max(hour_low, min(m_open, m_close) - abs(np.random.normal(0, noise_amplitude * 0.5)))
                
                simulated_candles.append({
                    "date": current_time.isoformat(),
                    "open": round(float(m_open), 2),
                    "high": round(float(m_high), 2),
                    "low": round(float(m_low), 2),
                    "close": round(float(m_close), 2),
                    "volume": base_vol + int(abs(np.random.normal(0, base_vol * 0.5)))
                })
                
        return simulated_candles
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")
