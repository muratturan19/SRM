import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.activity import ActivityType


class ActivityCreate(BaseModel):
    contact_id: uuid.UUID
    type: ActivityType = ActivityType.NOTE
    content: str
    outcome: Optional[str] = None
    due_at: Optional[datetime] = None
    is_done: bool = False


class ActivityUpdate(BaseModel):
    type: Optional[ActivityType] = None
    content: Optional[str] = None
    outcome: Optional[str] = None
    due_at: Optional[datetime] = None
    is_done: Optional[bool] = None


class ActivityRead(BaseModel):
    id: uuid.UUID
    contact_id: uuid.UUID
    type: ActivityType
    content: str
    outcome: Optional[str] = None
    due_at: Optional[datetime] = None
    is_done: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
