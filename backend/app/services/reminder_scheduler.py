"""
APScheduler-based reminder checker — 60 saniyede bir kontrol.
Container ortamında Windows toast yok; sadece loglama yapılır.
"""
import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

_scheduler = AsyncIOScheduler()


async def _check_reminders() -> None:
    """Vadesi gelen hatırlatıcıları işaretle (bildirim: sadece log)."""
    from app.core.database import _initialized, _get_session_maker
    from app.models.reminder import Reminder
    from sqlalchemy import select

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    for tenant_slug in list(_initialized):
        try:
            async with _get_session_maker(tenant_slug)() as session:
                result = await session.execute(
                    select(Reminder)
                    .where(Reminder.remind_at <= now)
                    .where(Reminder.is_done == False)  # noqa: E712
                    .where(Reminder.notified == False)  # noqa: E712
                )
                due = result.scalars().all()
                for r in due:
                    logger.info(
                        "Reminder due [tenant=%s]: %s",
                        tenant_slug,
                        r.title,
                    )
                    r.notified = True
                if due:
                    await session.commit()
        except Exception as exc:
            logger.error("Reminder check error [tenant=%s]: %s", tenant_slug, exc)


async def _check_passive_contacts() -> None:
    """Cevapsız kalıp takip hakkı biten kişileri pasife alır, 'yeniden temas'
    hatırlatıcısı açar. Eşikler (max_followups/passive_after_days/reactivate_after_days)
    SystemSettings'ten okunur — koda sabit yazılmaz."""
    from app.core.database import _initialized, _get_session_maker
    from app.models.contact import Contact
    from app.models.activity import Activity, ActivityType
    from app.models.reminder import Reminder
    from app.models.settings import SystemSettings
    from sqlalchemy import select, func

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    for tenant_slug in list(_initialized):
        try:
            async with _get_session_maker(tenant_slug)() as session:
                settings_res = await session.execute(select(SystemSettings).where(SystemSettings.id == 1))
                sys_s = settings_res.scalar_one_or_none()
                max_followups = sys_s.max_followups if sys_s else 2
                passive_after_days = sys_s.passive_after_days if sys_s else 14
                reactivate_after_days = sys_s.reactivate_after_days if sys_s else 90

                contacts_res = await session.execute(
                    select(Contact).where(Contact.is_passive == False)  # noqa: E712
                )
                changed = False
                for contact in contacts_res.scalars().all():
                    latest_res = await session.execute(
                        select(Activity)
                        .where(Activity.contact_id == contact.id, Activity.type == ActivityType.OUTREACH)
                        .order_by(Activity.created_at.desc())
                    )
                    latest = latest_res.scalars().first()
                    if not latest or latest.outcome not in (None, "sent", "no_response"):
                        continue

                    count_res = await session.execute(
                        select(func.count()).select_from(Activity)
                        .where(Activity.contact_id == contact.id, Activity.type == ActivityType.OUTREACH)
                    )
                    touch_count = count_res.scalar_one()
                    days_since = (now - latest.created_at).days
                    if touch_count >= max_followups and days_since >= passive_after_days:
                        contact.is_passive = True
                        contact.passive_since = now
                        session.add(Reminder(
                            contact_id=contact.id,
                            title=f"Yeniden temas: {contact.company or contact.name}",
                            remind_at=now + timedelta(days=reactivate_after_days),
                        ))
                        changed = True
                        logger.info("Pasife alındı [tenant=%s]: %s", tenant_slug, contact.name)
                if changed:
                    await session.commit()
        except Exception as exc:
            logger.error("Passive contact check error [tenant=%s]: %s", tenant_slug, exc)


def start_scheduler() -> None:
    _scheduler.add_job(
        _check_reminders,
        trigger=IntervalTrigger(seconds=60),
        id="reminder_check",
        replace_existing=True,
    )
    _scheduler.add_job(
        _check_passive_contacts,
        trigger=IntervalTrigger(seconds=60),
        id="passive_contact_check",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Reminder scheduler started")


def stop_scheduler() -> None:
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
