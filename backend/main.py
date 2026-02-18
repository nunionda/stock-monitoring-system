from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import httpx
import asyncio
from backend.database import create_db_and_tables
from backend.ws_manager import manager
from backend.tasks import broadcast_market_updates
from backend.routers import entries, trades, stocks

app = FastAPI(title="Portfolio Suite API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(entries.router)
app.include_router(trades.router)
app.include_router(stocks.router)

@app.on_event("startup")
async def on_startup():
    create_db_and_tables()
    # Fetch S&P 500 list for local search and populate stocks router cache
    try:
        async with httpx.AsyncClient() as client:
            url = "https://gist.githubusercontent.com/princefishthrower/30ab8a532b4b281ce5bfe386e1df7a29/raw/sandp500.json"
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                sp500 = [
                    {
                        "symbol": item.get("symbol"),
                        "name": item.get("name"),
                        "exchange": "S&P 500",
                        "type": "EQUITY"
                    }
                    for item in data.get("companies", [])
                ]
                stocks.STOCKS_CACHE.extend(sp500)
    except Exception as e:
        print(f"Failed to load stocks cache: {e}")
        
    # Add KOSPI Top 10 to cache
    kospi_top_10 = [
        {"symbol": "005930.KS", "name": "Samsung Electronics (삼성전자)", "exchange": "KRX", "type": "EQUITY"},
        {"symbol": "000660.KS", "name": "SK Hynix (SK하이닉스)", "exchange": "KRX", "type": "EQUITY"},
        {"symbol": "373220.KS", "name": "LG Energy Solution (LG에너지솔루션)", "exchange": "KRX", "type": "EQUITY"},
        {"symbol": "207940.KS", "name": "Samsung Biologics (삼성바이오로직스)", "exchange": "KRX", "type": "EQUITY"},
        {"symbol": "005380.KS", "name": "Hyundai Motor (현대자동차)", "exchange": "KRX", "type": "EQUITY"},
        {"symbol": "005935.KS", "name": "Samsung Electronics Pref (삼성전자우)", "exchange": "KRX", "type": "EQUITY"},
        {"symbol": "000270.KS", "name": "Kia (기아)", "exchange": "KRX", "type": "EQUITY"},
        {"symbol": "068270.KS", "name": "Celltrion (셀트리온)", "exchange": "KRX", "type": "EQUITY"},
        {"symbol": "105560.KS", "name": "KB Financial Group (KB금융)", "exchange": "KRX", "type": "EQUITY"},
        {"symbol": "005490.KS", "name": "POSCO Holdings (POSCO홀딩스)", "exchange": "KRX", "type": "EQUITY"},
    ]
    stocks.STOCKS_CACHE.extend(kospi_top_10)
    print(f"Loaded {len(stocks.STOCKS_CACHE)} stocks into cache.")

    # Start background task for market updates
    asyncio.create_task(broadcast_market_updates())

@app.get("/")
def read_root():
    return {"message": "Welcome to Portfolio Suite API"}

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
