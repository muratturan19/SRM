import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.contact import Contact
from app.models.activity import Activity
from app.models.outreach_template import OutreachTemplate
from app.schemas.outreach import (
    OutreachTemplateRead,
    OutreachTemplateUpdate,
    NextActionResponse,
    NextActionCandidate,
    SendRequest,
    SendResponse,
    OutcomeRequest,
    ReactivateResponse,
)
from app.schemas.activity import ActivityRead
from app.schemas.reminder import ReminderRead
from app.services import outreach_service as svc

router = APIRouter()


async def _get_contact(db: AsyncSession, contact_id: uuid.UUID) -> Contact:
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.get("/templates", response_model=list[OutreachTemplateRead])
async def list_templates(db: AsyncSession = Depends(get_db)):
    await svc.ensure_templates_seeded(db)
    result = await db.execute(select(OutreachTemplate).order_by(OutreachTemplate.sort_order))
    return result.scalars().all()


@router.patch("/templates/{template_id}", response_model=OutreachTemplateRead)
async def update_template(
    template_id: uuid.UUID,
    data: OutreachTemplateUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(OutreachTemplate).where(OutreachTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(template, field, value)
    await db.flush()
    await db.refresh(template)
    return template


@router.get("/contacts/{contact_id}/next-action", response_model=NextActionResponse)
async def next_action(contact_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    contact = await _get_contact(db, contact_id)
    await svc.ensure_templates_seeded(db)
    settings_obj = await svc.get_settings(db)
    suggestion = await svc.suggest_next_action(db, contact)

    now = datetime.utcnow()
    candidates: list[NextActionCandidate] = []
    for code in suggestion["candidate_codes"]:
        template = await svc.template_by_code(db, code)
        if not template:
            continue
        rendered = svc.render_template(template, contact, settings_obj)
        due = suggestion["due_date"]
        candidates.append(
            NextActionCandidate(
                template_code=template.code,
                title=template.title,
                channel=template.channel,
                subject=rendered["subject"],
                body=rendered["body"],
                missing_fields=rendered["missing_fields"],
                due_date=due,
                is_overdue=bool(due and due <= now),
            )
        )

    return NextActionResponse(
        contact_id=contact.id,
        is_passive=contact.is_passive,
        passive_since=contact.passive_since,
        suggest_passive=suggestion["suggest_passive"],
        candidates=candidates,
    )


async def _load_activity(db: AsyncSession, activity_id: uuid.UUID) -> Activity:
    result = await db.execute(select(Activity).where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return activity


@router.post("/contacts/{contact_id}/send", response_model=SendResponse)
async def send_outreach(contact_id: uuid.UUID, data: SendRequest, db: AsyncSession = Depends(get_db)):
    contact = await _get_contact(db, contact_id)
    template = await svc.template_by_code(db, data.template_code)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    settings_obj = await svc.get_settings(db)
    rendered = svc.render_template(template, contact, settings_obj, data.tarih_1, data.tarih_2)
    if rendered["missing_fields"]:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Eksik kişiselleştirme alanları — göndermeden önce kişi kaydını tamamlayın",
                "missing_fields": rendered["missing_fields"],
            },
        )

    channel = data.channel or template.channel
    if not channel:
        raise HTTPException(status_code=422, detail="Bu şablon için kanal belirtilmelidir")

    activity, reminder = await svc.log_touch(
        db, contact, data.template_code, channel, auto_schedule_followup=data.auto_schedule_followup
    )
    return SendResponse(
        activity=ActivityRead.model_validate(activity),
        reminder=ReminderRead.model_validate(reminder) if reminder else None,
    )


@router.post("/contacts/{contact_id}/outcome", response_model=SendResponse)
async def set_outcome_route(contact_id: uuid.UUID, data: OutcomeRequest, db: AsyncSession = Depends(get_db)):
    activity = await _load_activity(db, data.activity_id)
    if activity.contact_id != contact_id:
        raise HTTPException(status_code=404, detail="Activity not found for this contact")
    reminder = await svc.set_outcome(db, activity, data.outcome)
    return SendResponse(
        activity=ActivityRead.model_validate(activity),
        reminder=ReminderRead.model_validate(reminder) if reminder else None,
    )


@router.post("/contacts/{contact_id}/reactivate", response_model=ReactivateResponse)
async def reactivate(contact_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    contact = await _get_contact(db, contact_id)
    await svc.reactivate_contact(db, contact)
    return ReactivateResponse(
        contact_id=contact.id, is_passive=contact.is_passive, passive_since=contact.passive_since
    )


@router.post("/contacts/{contact_id}/mark-passive", response_model=ReactivateResponse)
async def mark_passive(contact_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    contact = await _get_contact(db, contact_id)
    await svc.mark_passive(db, contact)
    return ReactivateResponse(
        contact_id=contact.id, is_passive=contact.is_passive, passive_since=contact.passive_since
    )
