"""
APScheduler-based reminder checker — 60 saniyede bir kontrol.
Container ortamında Windows toast yok; sadece loglama yapılır.
"""
import logging
from datetime import datetime, timezone

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


def start_scheduler() -> None:
    _scheduler.add_job(
        _check_reminders,
        trigger=IntervalTrigger(seconds=60),
        id="reminder_check",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Reminder scheduler started")


def stop_scheduler() -> None:
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
