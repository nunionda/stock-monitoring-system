from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List
import httpx
import yfinance as yf
import pandas as pd
import asyncio
from datetime import datetime
from backend.database import create_db_and_tables, get_session
from backend.models import DiaryEntry, Trade, StockDailyStat
from backend.ws_manager import manager
from backend.tasks import broadcast_market_updates

# Global cache for stock search
STOCKS_CACHE = []

app = FastAPI(title="My Diary API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    create_db_and_tables()
    # Fetch S&P 500 list for local search
    global STOCKS_CACHE
    try:
        async with httpx.AsyncClient() as client:
            url = "https://gist.githubusercontent.com/princefishthrower/30ab8a532b4b281ce5bfe386e1df7a29/raw/sandp500.json"
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                STOCKS_CACHE = [
                    {
                        "symbol": item.get("symbol"),
                        "name": item.get("name"),
                        "exchange": "S&P 500",
                        "type": "EQUITY"
                    }
                    for item in data.get("companies", [])
                ]
                print(f"Loaded {len(STOCKS_CACHE)} stocks into cache.")
    except Exception as e:
        print(f"Failed to load stocks cache: {e}")
        
    # Start background task for market updates
    asyncio.create_task(broadcast_market_updates())

@app.get("/")
def read_root():
    return {"message": "Welcome to My Diary API"}

@app.post("/entries/", response_model=DiaryEntry)
def create_entry(entry: DiaryEntry, session: Session = Depends(get_session)):
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry

@app.get("/entries/", response_model=List[DiaryEntry])
def read_entries(session: Session = Depends(get_session)):
    entries = session.exec(select(DiaryEntry)).all()
    return entries

@app.get("/entries/{entry_id}", response_model=DiaryEntry)
def read_entry(entry_id: int, session: Session = Depends(get_session)):
    entry = session.get(DiaryEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

@app.delete("/entries/{entry_id}")
def delete_entry(entry_id: int, session: Session = Depends(get_session)):
    entry = session.get(DiaryEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    session.delete(entry)
    session.commit()
    return {"ok": True}

# Trade Endpoints
@app.post("/trades/", response_model=Trade)
def create_trade(trade: Trade, session: Session = Depends(get_session)):
    session.add(trade)
    session.commit()
    session.refresh(trade)
    return trade

@app.get("/trades/", response_model=List[Trade])
def read_trades(session: Session = Depends(get_session)):
    trades = session.exec(select(Trade)).all()
    return trades

@app.get("/trades/{trade_id}", response_model=Trade)
def read_trade(trade_id: int, session: Session = Depends(get_session)):
    trade = session.get(Trade, trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade

@app.delete("/trades/{trade_id}")
def delete_trade(trade_id: int, session: Session = Depends(get_session)):
    trade = session.get(Trade, trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    session.delete(trade)
    session.commit()
    return {"ok": True}

@app.get("/stocks/search")
async def search_stocks(q: str):
    if not q:
        return []
    
    q = q.upper()
    results = [
        s for s in STOCKS_CACHE 
        if q in s["symbol"].upper() or q in s["name"].upper()
    ]
    return results[:10]  # Return top 10 matches

@app.get("/stocks/price/{symbol}")
def get_stock_price(symbol: str):
    try:
        ticker = yf.Ticker(symbol)
        # Try to get live price from fast_info if available, or history
        price = ticker.fast_info.get('last_price')
        if price is None:
            # Fallback to recent history
            hist = ticker.history(period="1d")
            if not hist.empty:
                price = hist['Close'].iloc[-1]
        
        if price is not None:
            return {"symbol": symbol, "price": round(float(price), 2)}
        else:
            raise HTTPException(status_code=404, detail="Price not found")
    except Exception as e:
        print(f"Error fetching price for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/stocks/prices/")
async def get_stock_prices(symbols: List[str]):
    results = {}
    try:
        # yfinance can fetch multiple tickers at once
        tickers = yf.Tickers(" ".join(symbols))
        for symbol in symbols:
            ticker = tickers.tickers[symbol]
            price = ticker.fast_info.get('last_price')
            if price is None:
                hist = ticker.history(period="1d")
                if not hist.empty:
                    price = hist['Close'].iloc[-1]
            
            if price is not None:
                results[symbol] = round(float(price), 2)
            else:
                results[symbol] = None
        return results
    except Exception as e:
        print(f"Error fetching batch prices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stocks/stats/{symbol}")
async def get_stock_stats(symbol: str):
    try:
        ticker = yf.Ticker(symbol)
        # Fetch 30 days of daily data to calculate 14-period ATR
        hist = ticker.history(period="30d")
        if hist.empty:
            raise HTTPException(status_code=404, detail="No historical data found")
        
        # Calculate True Range (TR)
        # TR = max[ (high - low), |high - close_prev|, |low - close_prev| ]
        hist['HL'] = hist['High'] - hist['Low']
        hist['HCp'] = abs(hist['High'] - hist['Close'].shift(1))
        hist['LCp'] = abs(hist['Low'] - hist['Close'].shift(1))
        hist['TR'] = hist[['HL', 'HCp', 'LCp']].max(axis=1)
        
        # Calculate ATR (Simple Moving Average of TR)
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
        print(f"Error fetching stats for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/stocks/stats/record", response_model=StockDailyStat)
async def record_stock_stats(stat: StockDailyStat, session: Session = Depends(get_session)):
    try:
        # Ensure date is a datetime object (sometimes pydantic might leave it as string if not validated)
        if isinstance(stat.date, str):
            stat.date = datetime.fromisoformat(stat.date.replace('Z', '+00:00'))
        
        session.add(stat)
        session.commit()
        session.refresh(stat)
        return stat
    except Exception as e:
        print(f"Error recording stats: {e}")
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stocks/history/{symbol}", response_model=List[StockDailyStat])
async def get_stock_history(symbol: str, session: Session = Depends(get_session)):
    stats = session.exec(
        select(StockDailyStat)
        .where(StockDailyStat.symbol == symbol)
        .order_by(StockDailyStat.date.asc())
    ).all()
    return stats
@app.websocket("/ws/market")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)
