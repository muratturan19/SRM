import uuid
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.contact import Contact, ContactStage
from app.models.reminder import Reminder
from app.schemas.contact import ContactCreate, ContactUpdate, ContactRead, ContactReadWithRelations
from app.schemas.deal import DealRead
from app.schemas.reminder import ReminderRead
from app.core.config import settings
import os
import shutil

router = APIRouter()

MILESTONE_FIELDS = ("is_contacted", "is_met", "is_demo_sent", "is_proposal_sent")


async def _auto_reminders(db: AsyncSession, contact: Contact, changed_to_true: list[str]) -> None:
    """Create auto-reminders based on active SystemSettings rules."""
    if not changed_to_true:
        return
    from app.models.settings import SystemSettings
    from sqlalchemy import select as _sel
    res = await db.execute(_sel(SystemSettings).where(SystemSettings.id == 1))
    sys_s = res.scalar_one_or_none()
    if not sys_s:
        return
    for rule in sys_s.reminder_rules:
        if not rule.get("enabled"):
            continue
        if rule.get("trigger") not in changed_to_true:
            continue
        # Başlık: "Kişi Adı - Şirket Adı" formatı
        parts = [contact.name]
        if contact.company:
            parts.append(contact.company)
        title = " - ".join(parts)
        remind_at = datetime.utcnow() + timedelta(days=int(rule.get("days", 3)))
        db.add(Reminder(
            contact_id=contact.id,
            title=title,
            remind_at=remind_at,
        ))


@router.get("/", response_model=list[ContactRead])
async def list_contacts(
    search: Optional[str] = Query(None),
    stage: Optional[ContactStage] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    q = select(Contact)
    if search:
        term = f"%{search}%"
        q = q.where(
            or_(
                Contact.name.ilike(term),
                Contact.company.ilike(term),
                Contact.email.ilike(term),
                Contact.phone.ilike(term),
            )
        )
    if stage:
        q = q.where(Contact.stage == stage)
    q = q.order_by(Contact.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=ContactRead, status_code=201)
async def create_contact(data: ContactCreate, db: AsyncSession = Depends(get_db)):
    contact = Contact(**data.model_dump())
    db.add(contact)
    await db.flush()
    await db.refresh(contact)
    return contact


@router.get("/{contact_id}", response_model=ContactReadWithRelations)
async def get_contact(contact_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Contact)
        .where(Contact.id == contact_id)
        .options(selectinload(Contact.deals), selectinload(Contact.reminders))
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.patch("/{contact_id}", response_model=ContactRead)
async def update_contact(
    contact_id: uuid.UUID,
    data: ContactUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Detect milestone fields changing False → True before applying update
    update_dict = data.model_dump(exclude_unset=True)
    changed_to_true = [
        f for f in MILESTONE_FIELDS
        if f in update_dict and update_dict[f] is True and not getattr(contact, f)
    ]

    for field, value in update_dict.items():
        setattr(contact, field, value)

    await _auto_reminders(db, contact, changed_to_true)
    await db.flush()
    await db.refresh(contact)
    return contact


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(contact_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    await db.delete(contact)


@router.post("/{contact_id}/avatar", response_model=ContactRead)
async def upload_avatar(
    contact_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    ext = os.path.splitext(file.filename or "img.jpg")[1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(status_code=400, detail="Only JPEG/PNG/WebP allowed")

    filename = f"avatar_{contact_id}{ext}"
    dest = os.path.join(settings.upload_dir, filename)
    with open(dest, "wb") as out:
        shutil.copyfileobj(file.file, out)

    contact.avatar_path = f"/uploads/{filename}"
    await db.flush()
    await db.refresh(contact)
    return contact
