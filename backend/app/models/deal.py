import uuid
import enum
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, DateTime, Text, Numeric, ForeignKey, Date, Integer, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class DealStage(str, enum.Enum):
    NEW = "new"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"


class Deal(Base):
    __tablename__ = "deals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False
    )

    product_name: Mapped[str] = mapped_column(String(300), nullable=False)
    amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(3), default="TRY")
    stage: Mapped[DealStage] = mapped_column(
        SAEnum(DealStage, name="dealstage"), default=DealStage.NEW, nullable=False
    )
    probability: Mapped[int | None] = mapped_column(Integer)  # 0-100
    contract_date: Mapped[date | None] = mapped_column(Date)
    contract_pdf_path: Mapped[str | None] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    contact: Mapped["Contact"] = relationship("Contact", back_populates="deals")
