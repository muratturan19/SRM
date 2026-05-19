import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from pydantic import BaseModel, ConfigDict, field_validator
from app.models.contact import ContactStage
from app.core.phone_utils import normalize_phone

if TYPE_CHECKING:
    from app.schemas.deal import DealRead
    from app.schemas.reminder import ReminderRead
    from app.schemas.activity import ActivityRead


class ContactBase(BaseModel):
    name: str
    company: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    phone2: Optional[str] = None
    linkedin: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None
    tags: Optional[str] = None
    stage: ContactStage = ContactStage.LEAD
    is_contacted: bool = False
    is_met: bool = False
    is_demo_sent: bool = False
    is_proposal_sent: bool = False

    @field_validator('phone', 'phone2', mode='before')
    @classmethod
    def normalize_phones(cls, v):
        return normalize_phone(v)


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    phone2: Optional[str] = None
    linkedin: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None
    tags: Optional[str] = None
    stage: Optional[ContactStage] = None
    is_contacted: Optional[bool] = None
    is_met: Optional[bool] = None
    is_demo_sent: Optional[bool] = None
    is_proposal_sent: Optional[bool] = None

    @field_validator('phone', 'phone2', mode='before')
    @classmethod
    def normalize_phones(cls, v):
        return normalize_phone(v)


class ContactRead(ContactBase):
    id: uuid.UUID
    avatar_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ContactReadWithRelations(ContactRead):
    deals: List["DealRead"] = []
    reminders: List["ReminderRead"] = []
    activities: List["ActivityRead"] = []

    model_config = ConfigDict(from_attributes=True)


# Resolve forward references at module level
from app.schemas.deal import DealRead  # noqa: E402
from app.schemas.reminder import ReminderRead  # noqa: E402
from app.schemas.activity import ActivityRead  # noqa: E402
ContactReadWithRelations.model_rebuild()
