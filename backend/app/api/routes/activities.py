import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.activity import Activity
from app.models.contact import Contact
from app.schemas.activity import ActivityCreate, ActivityUpdate, ActivityRead

router = APIRouter()


@router.get("/contact/{contact_id}", response_model=list[ActivityRead])
async def list_activities(
    contact_id: uuid.UUID,
    type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Activity).where(Activity.contact_id == contact_id)
    if type:
        q = q.where(Activity.type == type)
    q = q.order_by(Activity.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=ActivityRead, status_code=201)
async def create_activity(data: ActivityCreate, db: AsyncSession = Depends(get_db)):
    contact = await db.execute(select(Contact).where(Contact.id == data.contact_id))
    if not contact.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Contact not found")
    activity = Activity(**data.model_dump())
    db.add(activity)
    await db.flush()
    await db.refresh(activity)
    return activity


@router.patch("/{activity_id}", response_model=ActivityRead)
async def update_activity(
    activity_id: uuid.UUID,
    data: ActivityUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Activity).where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(activity, field, value)
    await db.flush()
    await db.refresh(activity)
    return activity


@router.delete("/{activity_id}", status_code=204)
async def delete_activity(activity_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Activity).where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    await db.delete(activity)
