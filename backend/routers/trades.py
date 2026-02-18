from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from backend.database import get_session
from backend.models import Trade

router = APIRouter(prefix="/trades", tags=["trades"])

@router.post("/", response_model=Trade)
def create_trade(trade: Trade, session: Session = Depends(get_session)):
    session.add(trade)
    session.commit()
    session.refresh(trade)
    return trade

@router.get("/", response_model=List[Trade])
def read_trades(session: Session = Depends(get_session)):
    trades = session.exec(select(Trade)).all()
    return trades

@router.get("/{trade_id}", response_model=Trade)
def read_trade(trade_id: int, session: Session = Depends(get_session)):
    trade = session.get(Trade, trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade

@router.delete("/{trade_id}")
def delete_trade(trade_id: int, session: Session = Depends(get_session)):
    trade = session.get(Trade, trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    session.delete(trade)
    session.commit()
    return {"ok": True}
