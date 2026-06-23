import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.reminder import Reminder
from app.models.contact import Contact
from app.schemas.reminder import ReminderCreate, ReminderUpdate, ReminderRead

router = APIRouter()


def _enrich(r: Reminder) -> ReminderRead:
    """Add contact_name to the schema."""
    data = ReminderRead.model_validate(r)
    if r.contact:
        data.contact_name = r.contact.name
    return data


@router.get("/", response_model=list[ReminderRead])
async def list_reminders(
    include_done: bool = False,
    db: AsyncSession = Depends(get_db),
):
    q = select(Reminder).options(selectinload(Reminder.contact)).order_by(Reminder.remind_at)
    if not include_done:
        q = q.where(Reminder.is_done == False)
    result = await db.execute(q)
    rows = result.scalars().all()
    return [_enrich(r) for r in rows]


@router.get("/due", response_model=list[ReminderRead])
async def due_reminders(db: AsyncSession = Depends(get_db)):
    """Reminders that are due now and not yet notified (for frontend polling)."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    q = (
        select(Reminder)
        .options(selectinload(Reminder.contact))
        .where(Reminder.remind_at <= now)
        .where(Reminder.is_done == False)
        .where(Reminder.notified == False)
    )
    result = await db.execute(q)
    rows = result.scalars().all()
    # Mark as notified
    for r in rows:
        r.notified = True
    await db.flush()
    return [_enrich(r) for r in rows]


async def _load_reminder(db: AsyncSession, reminder_id) -> Reminder:
    r = await db.execute(
        select(Reminder).options(selectinload(Reminder.contact)).where(Reminder.id == reminder_id)
    )
    return r.scalar_one()


@router.post("/", response_model=ReminderRead, status_code=201)
async def create_reminder(data: ReminderCreate, db: AsyncSession = Depends(get_db)):
    reminder = Reminder(**data.model_dump())
    db.add(reminder)
    await db.flush()
    return _enrich(await _load_reminder(db, reminder.id))


@router.patch("/{reminder_id}", response_model=ReminderRead)
async def update_reminder(
    reminder_id: uuid.UUID,
    data: ReminderUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Reminder).where(Reminder.id == reminder_id))
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(reminder, field, value)
    await db.flush()
    return _enrich(await _load_reminder(db, reminder.id))


@router.delete("/{reminder_id}", status_code=204)
async def delete_reminder(reminder_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Reminder).where(Reminder.id == reminder_id))
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    await db.delete(reminder)


@router.post("/{reminder_id}/snooze", response_model=ReminderRead, status_code=201)
async def snooze_reminder(reminder_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Mark reminder as done and create a follow-up reminder based on snooze settings."""
    result = await db.execute(select(Reminder).where(Reminder.id == reminder_id))
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    # Load snooze settings
    from app.models.settings import SystemSettings
    res = await db.execute(select(SystemSettings).where(SystemSettings.id == 1))
    sys_s = res.scalar_one_or_none()
    snooze_days = sys_s.snooze_days if sys_s else 2

    # Mark current reminder as done
    reminder.is_done = True

    # Create new snoozed reminder
    new_remind_at = datetime.utcnow() + timedelta(days=snooze_days)
    snoozed = Reminder(
        contact_id=reminder.contact_id,
        title=reminder.title,
        description=reminder.description,
        remind_at=new_remind_at,
    )
    db.add(snoozed)
    await db.flush()
    # Re-fetch with contact to avoid lazy-load in async context
    result2 = await db.execute(
        select(Reminder).options(selectinload(Reminder.contact)).where(Reminder.id == snoozed.id)
    )
    return _enrich(result2.scalar_one())
