import uuid
from datetime import date, datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict
from app.models.outreach_template import OutreachChannel
from app.schemas.activity import ActivityRead
from app.schemas.reminder import ReminderRead

OutreachOutcome = Literal[
    "sent", "no_response", "replied_positive", "replied_negative", "meeting_booked"
]


class OutreachTemplateRead(BaseModel):
    id: uuid.UUID
    code: str
    title: str
    channel: Optional[OutreachChannel] = None
    applicable_tiers: str
    is_first_touch: bool
    subject: Optional[str] = None
    body: str
    follow_up_days: Optional[int] = None
    follow_up_template_code: Optional[str] = None
    triggers_generic_followup: bool
    active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OutreachTemplateUpdate(BaseModel):
    title: Optional[str] = None
    channel: Optional[OutreachChannel] = None
    applicable_tiers: Optional[str] = None
    is_first_touch: Optional[bool] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    follow_up_days: Optional[int] = None
    follow_up_template_code: Optional[str] = None
    triggers_generic_followup: Optional[bool] = None
    active: Optional[bool] = None
    sort_order: Optional[int] = None


class NextActionCandidate(BaseModel):
    template_code: str
    title: str
    channel: Optional[OutreachChannel] = None
    subject: Optional[str] = None
    body: str
    missing_fields: list[str] = []
    due_date: Optional[datetime] = None
    is_overdue: bool = False


class NextActionResponse(BaseModel):
    contact_id: uuid.UUID
    is_passive: bool
    passive_since: Optional[datetime] = None
    suggest_passive: bool = False  # şablon yerine "pasife al" önerisi
    candidates: list[NextActionCandidate] = []


class SendRequest(BaseModel):
    template_code: str
    channel: Optional[OutreachChannel] = None  # T7 gibi channel=null şablonlarda zorunlu
    tarih_1: Optional[date] = None
    tarih_2: Optional[date] = None
    auto_schedule_followup: bool = True


class SendResponse(BaseModel):
    activity: ActivityRead
    reminder: Optional[ReminderRead] = None


class OutcomeRequest(BaseModel):
    activity_id: uuid.UUID
    outcome: OutreachOutcome


class ReactivateResponse(BaseModel):
    contact_id: uuid.UUID
    is_passive: bool
    passive_since: Optional[datetime] = None
