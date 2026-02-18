import asyncio
import yfinance as yf
from datetime import datetime
from backend.ws_manager import manager

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
