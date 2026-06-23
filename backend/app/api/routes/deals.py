import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.deal import Deal
from app.models.contact import Contact
from app.schemas.deal import DealCreate, DealUpdate, DealRead
from app.core.config import settings
import os
import shutil

router = APIRouter()


@router.get("/", response_model=list[DealRead])
async def list_deals(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Deal).options(selectinload(Deal.contact)).order_by(Deal.created_at.desc())
    )
    return result.scalars().all()


@router.get("/contact/{contact_id}", response_model=list[DealRead])
async def deals_by_contact(contact_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Deal).options(selectinload(Deal.contact)).where(Deal.contact_id == contact_id)
    )
    return result.scalars().all()


@router.post("/", response_model=DealRead, status_code=201)
async def create_deal(data: DealCreate, db: AsyncSession = Depends(get_db)):
    # Verify contact exists
    contact = await db.execute(select(Contact).where(Contact.id == data.contact_id))
    if not contact.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Contact not found")

    deal = Deal(**data.model_dump())
    db.add(deal)
    await db.flush()
    await db.refresh(deal)
    return deal


@router.patch("/{deal_id}", response_model=DealRead)
async def update_deal(
    deal_id: uuid.UUID, data: DealUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(deal, field, value)
    await db.flush()
    await db.refresh(deal)
    return deal


@router.delete("/{deal_id}", status_code=204)
async def delete_deal(deal_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    await db.delete(deal)


@router.post("/{deal_id}/contract", response_model=DealRead)
async def upload_contract(
    deal_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    ext = os.path.splitext(file.filename or "contract.pdf")[1].lower()
    if ext not in {".pdf", ".docx", ".doc"}:
        raise HTTPException(status_code=400, detail="Only PDF/DOCX allowed")

    filename = f"contract_{deal_id}{ext}"
    dest = os.path.join(settings.upload_dir, filename)
    with open(dest, "wb") as out:
        shutil.copyfileobj(file.file, out)

    deal.contract_pdf_path = f"/uploads/{filename}"
    await db.flush()
    await db.refresh(deal)
    return deal
