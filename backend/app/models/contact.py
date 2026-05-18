import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Text, Enum as SAEnum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class ContactStage(str, enum.Enum):
    LEAD = "lead"
    CONTACTED = "contacted"
    MET = "met"
    DEMO_SENT = "demo_sent"
    PROPOSAL_SENT = "proposal_sent"
    CUSTOMER = "customer"


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Basic info
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    company: Mapped[str | None] = mapped_column(String(200))
    title: Mapped[str | None] = mapped_column(String(200))   # Job title / position
    email: Mapped[str | None] = mapped_column(String(200))
    phone: Mapped[str | None] = mapped_column(String(50))
    phone2: Mapped[str | None] = mapped_column(String(50))
    linkedin: Mapped[str | None] = mapped_column(String(500))
    website: Mapped[str | None] = mapped_column(String(500))
    address: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    avatar_path: Mapped[str | None] = mapped_column(String(500))  # Uploaded card image
    source: Mapped[str | None] = mapped_column(String(100))       # How contact was acquired
    tags: Mapped[str | None] = mapped_column(String(500))         # Comma-separated tags

    # Pipeline stage
    stage: Mapped[ContactStage] = mapped_column(
        SAEnum(ContactStage, name="contactstage"),
        default=ContactStage.LEAD,
        nullable=False,
    )

    # Milestone checkboxes
    is_contacted: Mapped[bool] = mapped_column(Boolean, default=False)
    is_met: Mapped[bool] = mapped_column(Boolean, default=False)
    is_demo_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    is_proposal_sent: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    deals: Mapped[list["Deal"]] = relationship("Deal", back_populates="contact", cascade="all, delete-orphan")
    reminders: Mapped[list["Reminder"]] = relationship("Reminder", back_populates="contact", cascade="all, delete-orphan")
