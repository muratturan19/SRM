import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ReminderBase(BaseModel):
    title: str
    description: Optional[str] = None
    remind_at: datetime
    contact_id: Optional[uuid.UUID] = None


class ReminderCreate(ReminderBase):
    pass


class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    remind_at: Optional[datetime] = None
    is_done: Optional[bool] = None
    contact_id: Optional[uuid.UUID] = None


class ReminderRead(ReminderBase):
    id: uuid.UUID
    is_done: bool
    notified: bool
    created_at: datetime
    contact_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
