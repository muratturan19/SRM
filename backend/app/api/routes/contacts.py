import uuid
import csv
import io
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, not_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.contact import Contact, ContactStage
from app.models.activity import Activity
from app.models.reminder import Reminder
from app.schemas.contact import ContactCreate, ContactUpdate, ContactRead, ContactReadWithRelations
from app.schemas.deal import DealRead
from app.schemas.reminder import ReminderRead
from app.core.phone_utils import normalize_phone
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
    tags: Optional[str] = Query(None),
    no_contact_days: Optional[int] = Query(None, ge=1),
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
    if tags:
        tag_term = f"%{tags}%"
        q = q.where(Contact.tags.ilike(tag_term))
    if no_contact_days:
        cutoff = datetime.utcnow() - timedelta(days=no_contact_days)
        recent_activity_subq = (
            select(Activity.contact_id)
            .where(Activity.created_at >= cutoff)
            .scalar_subquery()
        )
        q = q.where(not_(Contact.id.in_(recent_activity_subq)))
    q = q.order_by(Contact.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=ContactRead, status_code=201)
async def create_contact(data: ContactCreate, db: AsyncSession = Depends(get_db)):
    # Duplicate detection: phone veya email zaten varsa uyar
    if data.email or data.phone:
        filters = []
        if data.email:
            filters.append(Contact.email == data.email)
        if data.phone:
            filters.append(Contact.phone == data.phone)
        existing = await db.execute(select(Contact).where(or_(*filters)).limit(3))
        dupes = existing.scalars().all()
        if dupes:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Benzer kişi zaten mevcut",
                    "duplicates": [
                        {"id": str(d.id), "name": d.name, "company": d.company, "email": d.email, "phone": d.phone}
                        for d in dupes
                    ],
                },
            )
    contact = Contact(**data.model_dump())
    db.add(contact)
    await db.flush()
    await db.refresh(contact)
    return contact


@router.get("/{contact_id}", response_model=ContactReadWithRelations)
async def get_contact(contact_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    from app.models.activity import Activity
    result = await db.execute(
        select(Contact)
        .where(Contact.id == contact_id)
        .options(
            selectinload(Contact.deals),
            selectinload(Contact.reminders),
            selectinload(Contact.activities),
        )
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


# ── CSV Export ────────────────────────────────────────────────────────────────
CSV_FIELDS = [
    "name", "company", "title", "email", "phone", "phone2",
    "linkedin", "website", "address", "notes", "source", "tags", "stage",
]

@router.get("/export/csv")
async def export_contacts_csv(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Contact).order_by(Contact.created_at.desc()))
    contacts = result.scalars().all()

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=CSV_FIELDS, extrasaction="ignore")
    writer.writeheader()
    for c in contacts:
        writer.writerow({f: getattr(c, f, "") or "" for f in CSV_FIELDS})

    output.seek(0)
    filename = f"srm_contacts_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue().encode("utf-8-sig")]),  # utf-8-sig: Excel BOM uyumu
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── CSV Import ────────────────────────────────────────────────────────────────
@router.post("/import/csv")
async def import_contacts_csv(
    file: UploadFile = File(...),
    skip_duplicates: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Sadece .csv dosyası kabul edilir")

    content = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))

    created = 0
    skipped = 0
    errors: list[str] = []

    for i, row in enumerate(reader, start=2):  # satır 1 başlık
        name = (row.get("name") or "").strip()
        if not name:
            errors.append(f"Satır {i}: 'name' alanı boş, atlandı")
            skipped += 1
            continue

        email = (row.get("email") or "").strip() or None
        phone = normalize_phone((row.get("phone") or "").strip() or None)

        # Duplicate check
        if skip_duplicates and (email or phone):
            filters = []
            if email:
                filters.append(Contact.email == email)
            if phone:
                filters.append(Contact.phone == phone)
            existing = await db.execute(select(Contact).where(or_(*filters)).limit(1))
            if existing.scalar_one_or_none():
                skipped += 1
                continue

        stage_val = (row.get("stage") or "lead").strip().lower()
        try:
            stage = ContactStage(stage_val)
        except ValueError:
            stage = ContactStage.LEAD

        contact = Contact(
            name=name,
            company=(row.get("company") or "").strip() or None,
            title=(row.get("title") or "").strip() or None,
            email=email,
            phone=phone,
            phone2=normalize_phone((row.get("phone2") or "").strip() or None),
            linkedin=(row.get("linkedin") or "").strip() or None,
            website=(row.get("website") or "").strip() or None,
            address=(row.get("address") or "").strip() or None,
            notes=(row.get("notes") or "").strip() or None,
            source=(row.get("source") or "").strip() or None,
            tags=(row.get("tags") or "").strip() or None,
            stage=stage,
        )
        db.add(contact)
        created += 1

    await db.flush()
    return {"created": created, "skipped": skipped, "errors": errors}
