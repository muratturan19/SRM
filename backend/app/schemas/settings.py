from typing import List, Optional
from pydantic import BaseModel


class ReminderRule(BaseModel):
    trigger: str
    days: int
    enabled: bool
    title: Optional[str] = None  # artık backend'de auto-generate ediliyor


class SystemSettingsRead(BaseModel):
    reminder_rules: List[ReminderRule]
    snooze_enabled: bool
    snooze_days: int


class SystemSettingsUpdate(BaseModel):
    reminder_rules: Optional[List[ReminderRule]] = None
    snooze_enabled: Optional[bool] = None
    snooze_days: Optional[int] = None
