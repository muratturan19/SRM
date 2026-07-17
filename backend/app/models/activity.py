import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Text, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class ActivityType(str, enum.Enum):
    CALL = "call"
    MEETING = "meeting"
    EMAIL = "email"
    NOTE = "note"
    TASK = "task"
    OUTREACH = "outreach"  # Şablon bazlı temas kaydı (kolektif360 yaklaşım süreci)


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False
    )

    type: Mapped[ActivityType] = mapped_column(
        SAEnum(ActivityType, name="activitytype"),
        nullable=False,
        default=ActivityType.NOTE,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    outcome: Mapped[str | None] = mapped_column(String(500))  # arama/toplantı sonucu

    # Temas (outreach) kaydı alanları — sadece type=OUTREACH için doldurulur
    template_code: Mapped[str | None] = mapped_column(String(10))   # "T1".."T8"
    channel: Mapped[str | None] = mapped_column(String(20))         # whatsapp/email/linkedin_note/...

    # Görev alanları
    due_at: Mapped[datetime | None] = mapped_column(DateTime)
    is_done: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    contact: Mapped["Contact"] = relationship("Contact", back_populates="activities")  # type: ignore[name-defined]
