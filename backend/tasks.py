import asyncio
import yfinance as yf
import pandas as pd
from datetime import datetime, time
from sqlmodel import Session, select
from backend.ws_manager import manager
from backend.database import engine
from backend.models import StockDailyStat

async def auto_record_daily_stats():
    """Background task to record daily ATR and price stats for key symbols"""
    symbols = ['ES=F', 'AAPL', 'NVDA', 'TSLA']
    print(f"🕒 Starting ATR Persistence task for: {symbols}")
    
    while True:
        try:
            for symbol in symbols:
                # 1. Fetch 30d history for ATR calculation
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="30d")
                if hist.empty:
                    continue
                
                # 2. Calculate ATR(14) using Wilder's Smoothing (EMA with alpha = 1/period)
                hist['HL'] = hist['High'] - hist['Low']
                hist['HCp'] = abs(hist['High'] - hist['Close'].shift(1))
                hist['LCp'] = abs(hist['Low'] - hist['Close'].shift(1))
                hist['TR'] = hist[['HL', 'HCp', 'LCp']].max(axis=1)
                
                # Wilder's Smoothing: ewm with alpha=1/14 is equivalent to Wilder's ATR math
                atr_series = hist['TR'].ewm(alpha=1/14, adjust=False).mean()
                atr = atr_series.iloc[-1]
                
                last_item = hist.iloc[-1]
                date_only = last_item.name.date()
                
                # 3. Check for existing record for today (avoid duplicates)
                with Session(engine) as session:
                    start_of_day = datetime.combine(date_only, time.min)
                    end_of_day = datetime.combine(date_only, time.max)
                    
                    existing = session.exec(
                        select(StockDailyStat)
                        .where(StockDailyStat.symbol == symbol)
                        .where(StockDailyStat.date >= start_of_day)
                        .where(StockDailyStat.date <= end_of_day)
                    ).first()
                    
                    if not existing:
                        change = last_item['Close'] - hist.iloc[-2]['Close'] if len(hist) > 1 else 0
                        change_percent = (change / hist.iloc[-2]['Close'] * 100) if len(hist) > 1 and hist.iloc[-2]['Close'] != 0 else 0
                        
                        stat = StockDailyStat(
                            symbol=symbol,
                            date=start_of_day,
                            price=round(float(last_item['Close']), 2),
                            change_percent=round(float(change_percent), 2),
                            volume=int(last_item['Volume']),
                            atr=round(float(atr), 2) if not pd.isna(atr) else None,
                            open=round(float(last_item['Open']), 2),
                            high=round(float(last_item['High']), 2),
                            low=round(float(last_item['Low']), 2)
                        )
                        session.add(stat)
                        session.commit()
                        print(f"✅ [ATR Task] Recorded stats for {symbol} on {date_only}")
                
            # Sleep for 12 hours before next check
            await asyncio.sleep(12 * 3600)
        except Exception as e:
            print(f"❌ [ATR Task] Error: {e}")
            await asyncio.sleep(300) # Retry after 5 mins on error

async def broadcast_market_updates():
    """Background task to fetch prices and broadcast via WebSocket"""
    while True:
        if not manager.active_connections:
            await asyncio.sleep(5)
            continue
            
        # Symbols to monitor
        symbols = ['005930.KS', '000660.KS', 'AAPL', 'NVDA', 'TSLA']
        
        for symbol in symbols:
            if not manager.active_connections: break
            try:
                loop = asyncio.get_event_loop()
                def fetch_fast():
                    ticker = yf.Ticker(symbol)
                    return ticker.fast_info
                
                info = await loop.run_in_executor(None, fetch_fast)
                
                update = {
                    "type": "stock_update",
                    "symbol": symbol,
                    "price": round(float(info['lastPrice']), 2),
                    "change": round(float(info['lastPrice'] - info['previousClose']), 2) if 'previousClose' in info else 0,
                    "change_percent": round(float((info['lastPrice'] - info['previousClose']) / info['previousClose'] * 100), 2) if 'previousClose' in info and info['previousClose'] != 0 else 0,
                    "timestamp": datetime.utcnow().isoformat()
                }
                await manager.broadcast(update)
                await asyncio.sleep(1) # Rate limiting
            except Exception as e:
                if "rate limit" in str(e).lower():
                    await asyncio.sleep(10)
                continue
        
        await asyncio.sleep(5)
