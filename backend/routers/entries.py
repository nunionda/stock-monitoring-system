from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from backend.database import get_session
from backend.models import DiaryEntry

router = APIRouter(prefix="/entries", tags=["entries"])

@router.post("/", response_model=DiaryEntry)
def create_entry(entry: DiaryEntry, session: Session = Depends(get_session)):
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry

@router.get("/", response_model=List[DiaryEntry])
def read_entries(session: Session = Depends(get_session)):
    entries = session.exec(select(DiaryEntry)).all()
    return entries

@router.get("/{entry_id}", response_model=DiaryEntry)
def read_entry(entry_id: int, session: Session = Depends(get_session)):
    entry = session.get(DiaryEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

@router.delete("/{entry_id}")
def delete_entry(entry_id: int, session: Session = Depends(get_session)):
    entry = session.get(DiaryEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    session.delete(entry)
    session.commit()
    return {"ok": True}
