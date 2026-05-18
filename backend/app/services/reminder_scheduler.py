"""
APScheduler-based reminder checker.
Fires every 60 seconds; shows Windows toast notifications via plyer.
"""
import logging
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

# Try to import plyer for native Windows notifications
try:
    from plyer import notification as _plyer_notify

    def _toast(title: str, message: str) -> None:
        _plyer_notify.notify(
            title=title,
            message=message,
            app_name="Kolektif360 CRM",
            timeout=12,
        )

except Exception:
    # Fallback: PowerShell toast (Windows only, no extra dependency)
    import subprocess
    import sys

    def _toast(title: str, message: str) -> None:
        if sys.platform != "win32":
            return
        # Sanitise inputs for PowerShell
        safe_title = title.replace('"', "'").replace("`", "")
        safe_msg = message.replace('"', "'").replace("`", "")
        ps = (
            "[void][Windows.UI.Notifications.ToastNotificationManager,"
            "Windows.UI.Notifications,ContentType=WindowsRuntime];"
            "$t=[Windows.UI.Notifications.ToastNotificationManager]::"
            "GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02);"
            "$e=$t.GetElementsByTagName('text');"
            f'$e.Item(0).AppendChild($t.CreateTextNode("{safe_title}"))|Out-Null;'
            f'$e.Item(1).AppendChild($t.CreateTextNode("{safe_msg}"))|Out-Null;'
            "$n=[Windows.UI.Notifications.ToastNotification]::new($t);"
            "[Windows.UI.Notifications.ToastNotificationManager]::"
            'CreateToastNotifier("Kolektif360 CRM").Show($n)'
        )
        try:
            subprocess.run(
                ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps],
                capture_output=True,
                timeout=5,
            )
        except Exception as exc:
            logger.debug("Toast notification failed: %s", exc)


_scheduler = AsyncIOScheduler()


async def _check_reminders() -> None:
    """Check for due reminders and show Windows notifications."""
    from app.core.database import AsyncSessionLocal
    from app.models.reminder import Reminder
    from sqlalchemy import select

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(Reminder)
                .where(Reminder.remind_at <= now)
                .where(Reminder.is_done == False)
                .where(Reminder.notified == False)
            )
            due = result.scalars().all()
            for r in due:
                contact_name = ""
                if r.contact:
                    contact_name = f" — {r.contact.name}"
                _toast(
                    "Kolektif360 CRM Hatırlatıcı",
                    f"{r.title}{contact_name}",
                )
                r.notified = True
            if due:
                await session.commit()
                logger.info("Notified %d reminder(s)", len(due))
        except Exception as exc:
            logger.error("Reminder check error: %s", exc)
            await session.rollback()


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
