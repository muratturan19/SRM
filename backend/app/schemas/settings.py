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
    max_followups: int
    passive_after_days: int
    reactivate_after_days: int
    selin_title: str


class SystemSettingsUpdate(BaseModel):
    reminder_rules: Optional[List[ReminderRule]] = None
    snooze_enabled: Optional[bool] = None
    snooze_days: Optional[int] = None
    max_followups: Optional[int] = None
    passive_after_days: Optional[int] = None
    reactivate_after_days: Optional[int] = None
    selin_title: Optional[str] = None
