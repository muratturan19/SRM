from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ReminderRule(BaseModel):
    trigger: str
    days: int
    enabled: bool
    title: Optional[str] = None  # artık backend'de auto-generate ediliyor


class SystemSettingsRead(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    reminder_rules: List[ReminderRule]
    snooze_enabled: bool
    snooze_days: int
    max_followups: int
    passive_after_days: int
    reactivate_after_days: int
    sender_title: str = Field(validation_alias="selin_title")


class SystemSettingsUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    reminder_rules: Optional[List[ReminderRule]] = None
    snooze_enabled: Optional[bool] = None
    snooze_days: Optional[int] = None
    max_followups: Optional[int] = None
    passive_after_days: Optional[int] = None
    reactivate_after_days: Optional[int] = None
    sender_title: Optional[str] = Field(default=None, validation_alias="selin_title")
