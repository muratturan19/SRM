import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.deal import DealStage


class DealBase(BaseModel):
    product_name: str
    amount: Optional[Decimal] = None
    currency: str = "TRY"
    stage: DealStage = DealStage.NEW
    probability: Optional[int] = None
    contract_date: Optional[date] = None
    notes: Optional[str] = None


class DealCreate(DealBase):
    contact_id: uuid.UUID


class DealUpdate(BaseModel):
    product_name: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    stage: Optional[DealStage] = None
    probability: Optional[int] = None
    contract_date: Optional[date] = None
    notes: Optional[str] = None


class DealRead(DealBase):
    id: uuid.UUID
    contact_id: uuid.UUID
    contract_pdf_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
