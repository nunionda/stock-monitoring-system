from typing import Optional
from sqlmodel import Field, SQLModel

from datetime import datetime

class DiaryEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    content: str
    mood: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
