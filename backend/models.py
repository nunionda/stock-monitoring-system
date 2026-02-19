from typing import Optional
from sqlmodel import Field, SQLModel

from datetime import datetime

class DiaryEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    content: str
    mood: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Trade(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    stock_name: str = Field(index=True)
    type: str  # Buy or Sell
    price: float
    quantity: int
    market: str = Field(default="US", index=True) # "US" or "KR"
    trade_date: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class StockDailyStat(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    symbol: str = Field(index=True)
    date: datetime = Field(default_factory=datetime.utcnow)
    price: float
    change_percent: float
    volume: int
    atr: Optional[float] = None
    open: float
    high: float
    low: float
    recorded_at: datetime = Field(default_factory=datetime.utcnow)
