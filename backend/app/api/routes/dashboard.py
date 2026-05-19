from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, String
from app.core.database import get_db
from app.models.contact import Contact, ContactStage
from app.models.deal import Deal
from app.models.reminder import Reminder
from datetime import datetime, timezone, timedelta, date

router = APIRouter()


@router.get("/stats")
async def dashboard_stats(db: AsyncSession = Depends(get_db)):
    # Contact counts by stage
    stage_result = await db.execute(
        select(Contact.stage, func.count(Contact.id)).group_by(Contact.stage)
    )
    stage_counts = {row[0]: row[1] for row in stage_result.all()}

    total = sum(stage_counts.values())
    customers = stage_counts.get(ContactStage.CUSTOMER, 0)
    conversion_rate = round(customers / total * 100, 1) if total > 0 else 0

    # Total deal value
    deal_result = await db.execute(
        select(func.sum(Deal.amount)).where(Deal.amount != None)
    )
    total_deal_value = float(deal_result.scalar() or 0)

    # Open pipeline value (not won/lost)
    open_stage_values = ["new", "qualified", "proposal", "negotiation"]
    pipeline_result = await db.execute(
        select(func.sum(Deal.amount)).where(cast(Deal.stage, String).in_(open_stage_values), Deal.amount != None)
    )
    pipeline_value = float(pipeline_result.scalar() or 0)

    # Weighted forecast (amount * probability / 100) for open deals
    weighted_result = await db.execute(
        select(Deal.amount, Deal.probability).where(cast(Deal.stage, String).in_(open_stage_values), Deal.amount != None)
    )
    weighted_forecast = sum(
        float(row[0]) * (row[1] or 0) / 100
        for row in weighted_result.all()
    )

    # Deal value by stage
    deal_stage_result = await db.execute(
        select(Deal.stage, func.sum(Deal.amount))
        .where(Deal.amount != None)
        .group_by(Deal.stage)
    )
    deal_stage_values = {(row[0].value if hasattr(row[0], 'value') else str(row[0])): float(row[1]) for row in deal_stage_result.all()}

    # This month deals (contract_date in current month)
    today = date.today()
    month_start = today.replace(day=1)
    this_month_result = await db.execute(
        select(func.sum(Deal.amount)).where(
            Deal.contract_date >= month_start,
            Deal.contract_date <= today,
            Deal.amount != None,
        )
    )
    this_month_value = float(this_month_result.scalar() or 0)

    # Upcoming reminders (next 7 days)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    week_ahead = now + timedelta(days=7)
    reminder_result = await db.execute(
        select(func.count(Reminder.id)).where(
            Reminder.remind_at >= now,
            Reminder.remind_at <= week_ahead,
            Reminder.is_done == False,
        )
    )
    upcoming_reminders = reminder_result.scalar() or 0

    # Recent contacts
    recent_result = await db.execute(
        select(Contact).order_by(Contact.created_at.desc()).limit(5)
    )
    recent_contacts = recent_result.scalars().all()

    return {
        "total_contacts": total,
        "stage_counts": {k.value: v for k, v in stage_counts.items()},
        "customers": customers,
        "conversion_rate": conversion_rate,
        "total_deal_value": total_deal_value,
        "pipeline_value": pipeline_value,
        "weighted_forecast": round(weighted_forecast, 2),
        "this_month_value": this_month_value,
        "deal_stage_values": deal_stage_values,
        "upcoming_reminders": upcoming_reminders,
        "recent_contacts": [
            {
                "id": str(c.id),
                "name": c.name,
                "company": c.company,
                "stage": c.stage.value,
                "created_at": c.created_at.isoformat(),
            }
            for c in recent_contacts
        ],
    }
