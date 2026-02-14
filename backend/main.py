from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List
from .database import create_db_and_tables, get_session
from .models import DiaryEntry

app = FastAPI(title="My Diary API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

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
