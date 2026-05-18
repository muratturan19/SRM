import json
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.settings import SystemSettings, DEFAULT_RULES
from app.schemas.settings import SystemSettingsRead, SystemSettingsUpdate

router = APIRouter()


async def _get_or_create(db: AsyncSession) -> SystemSettings:
    result = await db.execute(select(SystemSettings).where(SystemSettings.id == 1))
    s = result.scalar_one_or_none()
    if not s:
        s = SystemSettings(id=1, reminder_rules_json=json.dumps(DEFAULT_RULES))
        db.add(s)
        await db.flush()
    return s


@router.get("/", response_model=SystemSettingsRead)
async def get_settings(db: AsyncSession = Depends(get_db)):
    s = await _get_or_create(db)
    return SystemSettingsRead(
        reminder_rules=s.reminder_rules,
        snooze_enabled=s.snooze_enabled,
        snooze_days=s.snooze_days,
    )


@router.put("/", response_model=SystemSettingsRead)
async def update_settings(data: SystemSettingsUpdate, db: AsyncSession = Depends(get_db)):
    s = await _get_or_create(db)
    if data.reminder_rules is not None:
        s.reminder_rules = [r.model_dump() for r in data.reminder_rules]
    if data.snooze_enabled is not None:
        s.snooze_enabled = data.snooze_enabled
    if data.snooze_days is not None:
        s.snooze_days = data.snooze_days
    await db.flush()
    return SystemSettingsRead(
        reminder_rules=s.reminder_rules,
        snooze_enabled=s.snooze_enabled,
        snooze_days=s.snooze_days,
    )
