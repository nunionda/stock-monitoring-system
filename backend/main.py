from fastapi import FastAPI, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from .database import create_db_and_tables, get_session
from .models import Hero

app = FastAPI(title="AI Coding Backend")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Coding Backend"}

@app.post("/heroes/", response_model=Hero)
def create_hero(hero: Hero, session: Session = Depends(get_session)):
    session.add(hero)
    session.commit()
    session.refresh(hero)
    return hero

@app.get("/heroes/", response_model=List[Hero])
def read_heroes(session: Session = Depends(get_session)):
    heroes = session.exec(select(Hero)).all()
    return heroes
