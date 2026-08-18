"""
Temas (outreach) sürecini yöneten servis:
- Şablon metnini kişi verisiyle doldurma (kişiselleştirme kilidi)
- Kişinin geçmiş temaslarına göre sıradaki şablonu/aksiyonu önerme
- Temas kaydı (Activity type=OUTREACH) oluşturup otomatik takip hatırlatıcısı açma

Belgedeki gün sayıları (7/14/90) burada sabit yazılmaz — SystemSettings'ten okunur.
"""
import re
from datetime import date, datetime, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import Activity, ActivityType
from app.models.contact import Contact
from app.models.outreach_template import OutreachTemplate, DEFAULT_TEMPLATES
from app.models.reminder import Reminder
from app.models.settings import SystemSettings

PLACEHOLDER_RE = re.compile(r"\{\{(\w+)\}\}")


def _next_business_days(count: int = 2, start: date | None = None) -> list[date]:
    cur = start or date.today()
    days: list[date] = []
    while len(days) < count:
        cur = cur + timedelta(days=1)
        if cur.weekday() < 5:  # Pazartesi-Cuma
            days.append(cur)
    return days


async def get_settings(db: AsyncSession) -> SystemSettings:
    result = await db.execute(select(SystemSettings).where(SystemSettings.id == 1))
    s = result.scalar_one_or_none()
    if not s:
        s = SystemSettings(id=1)
        db.add(s)
        await db.flush()
    return s


async def ensure_templates_seeded(db: AsyncSession) -> None:
    result = await db.execute(select(OutreachTemplate))
    existing_by_code = {template.code: template for template in result.scalars().all()}

    from app.models.outreach_template import LEGACY_TEMPLATE_SIGNATURES

    for tpl in DEFAULT_TEMPLATES:
        current = existing_by_code.get(tpl["code"])
        if current is None:
            db.add(OutreachTemplate(**tpl))
            continue

        legacy_signatures = LEGACY_TEMPLATE_SIGNATURES.get(current.code, [])
        if not _matches_legacy_template(current.body, legacy_signatures):
            continue

        preserved_active = current.active
        for field, value in tpl.items():
            setattr(current, field, value)
        current.active = preserved_active
    await db.flush()


def _matches_legacy_template(body: str, signatures: list[tuple[str, ...]]) -> bool:
    normalized = " ".join(body.split())
    for signature in signatures:
        if all(fragment in normalized for fragment in signature):
            return True
    return False


async def template_by_code(db: AsyncSession, code: str) -> OutreachTemplate | None:
    result = await db.execute(select(OutreachTemplate).where(OutreachTemplate.code == code))
    return result.scalar_one_or_none()


async def _active_first_touch_templates(db: AsyncSession) -> list[OutreachTemplate]:
    result = await db.execute(
        select(OutreachTemplate)
        .where(OutreachTemplate.active == True, OutreachTemplate.is_first_touch == True)  # noqa: E712
        .order_by(OutreachTemplate.sort_order)
    )
    return list(result.scalars().all())


async def _latest_outreach_activity(db: AsyncSession, contact_id) -> Activity | None:
    result = await db.execute(
        select(Activity)
        .where(Activity.contact_id == contact_id, Activity.type == ActivityType.OUTREACH)
        .order_by(Activity.created_at.desc())
    )
    return result.scalars().first()


async def _touch_count(db: AsyncSession, contact_id) -> int:
    result = await db.execute(
        select(func.count()).select_from(Activity)
        .where(Activity.contact_id == contact_id, Activity.type == ActivityType.OUTREACH)
    )
    return result.scalar_one()


def render_template(
    template: OutreachTemplate,
    contact: Contact,
    settings_obj: SystemSettings,
    tarih_1: date | None = None,
    tarih_2: date | None = None,
) -> dict:
    """Şablon metnindeki {{placeholder}} alanlarını kişi verisiyle doldurur.

    Doldurulamayan zorunlu alanlar `missing_fields` içinde döner — kişiselleştirme
    kilidi: bunlar boş kalmadıkça gönderim engellenmelidir (bkz. api/routes/outreach.py).
    """
    if tarih_1 is None or tarih_2 is None:
        d1, d2 = _next_business_days(2)
        tarih_1 = tarih_1 or d1
        tarih_2 = tarih_2 or d2

    values = {
        "isim": contact.name,
        "unvan": contact.title,
        "firma": contact.company,
        "referans": contact.referred_by,
        "ortak_baglam": contact.common_context,
        "selin_unvan": settings_obj.sender_title,
        "gonderen_unvani": settings_obj.sender_title,
        "tarih_1": tarih_1.strftime("%d.%m.%Y") if tarih_1 else None,
        "tarih_2": tarih_2.strftime("%d.%m.%Y") if tarih_2 else None,
    }

    missing: list[str] = []

    def _sub(text: str | None) -> str | None:
        if text is None:
            return None

        def repl(m: re.Match) -> str:
            key = m.group(1)
            val = values.get(key)
            if not val:
                if key not in missing:
                    missing.append(key)
                return f"[{key}?]"
            return str(val)

        return PLACEHOLDER_RE.sub(repl, text)

    return {
        "subject": _sub(template.subject),
        "body": _sub(template.body) or "",
        "missing_fields": missing,
    }


async def suggest_next_action(db: AsyncSession, contact: Contact) -> dict:
    """Kişinin geçmiş temas kayıtlarına göre sıradaki aksiyonu belirler.

    Döner: {"suggest_passive": bool, "candidate_codes": list[str], "due_date": datetime|None}
    """
    if contact.is_passive:
        return {"suggest_passive": False, "candidate_codes": [], "due_date": None}

    settings_obj = await get_settings(db)
    latest = await _latest_outreach_activity(db, contact.id)

    if latest is None:
        if not contact.outreach_tier:
            return {"suggest_passive": False, "candidate_codes": [], "due_date": None}
        templates = await _active_first_touch_templates(db)
        candidates = [
            t.code for t in templates
            if not t.applicable_tiers or contact.outreach_tier.value in t.applicable_tiers.split(",")
        ]
        return {"suggest_passive": False, "candidate_codes": candidates, "due_date": datetime.utcnow()}

    outcome = latest.outcome or "sent"

    if outcome == "meeting_booked":
        return {"suggest_passive": False, "candidate_codes": ["T8"], "due_date": datetime.utcnow()}

    if outcome == "replied_positive":
        if latest.template_code == "T3":
            due = latest.created_at + timedelta(days=1)
            return {"suggest_passive": False, "candidate_codes": ["T4"], "due_date": due}
        # Pozitif cevap sonrası görüşme kullanıcı tarafından planlanır — otomatik şablon önerilmez.
        return {"suggest_passive": False, "candidate_codes": [], "due_date": None}

    if outcome == "replied_negative":
        return {"suggest_passive": True, "candidate_codes": [], "due_date": None}

    # outcome in ("sent", "no_response") — henüz cevap alınmadı
    touch_count = await _touch_count(db, contact.id)
    days_since = (datetime.utcnow() - latest.created_at).days

    if touch_count >= settings_obj.max_followups:
        if days_since >= settings_obj.passive_after_days:
            return {"suggest_passive": True, "candidate_codes": [], "due_date": None}
        return {"suggest_passive": False, "candidate_codes": [], "due_date": None}

    prior_template = await template_by_code(db, latest.template_code) if latest.template_code else None
    if prior_template and prior_template.triggers_generic_followup and prior_template.follow_up_template_code:
        due = latest.created_at + timedelta(days=prior_template.follow_up_days or 0)
        return {"suggest_passive": False, "candidate_codes": [prior_template.follow_up_template_code], "due_date": due}

    return {"suggest_passive": False, "candidate_codes": [], "due_date": None}


async def log_touch(
    db: AsyncSession,
    contact: Contact,
    template_code: str,
    channel,
    auto_schedule_followup: bool = True,
) -> tuple[Activity, Reminder | None]:
    """Temas kaydını (Activity type=OUTREACH) oluşturur; varsayılan olarak sonraki
    takip için otomatik bir Reminder açar — kullanıcı bunu dilediği gibi düzenleyebilir/silebilir."""
    settings_obj = await get_settings(db)
    template = await template_by_code(db, template_code)
    rendered = (
        render_template(template, contact, settings_obj)
        if template else {"body": f"Şablon {template_code} gönderildi", "subject": None, "missing_fields": []}
    )

    channel_str = channel.value if hasattr(channel, "value") else channel

    activity = Activity(
        contact_id=contact.id,
        type=ActivityType.OUTREACH,
        content=rendered["body"],
        outcome="sent",
        template_code=template_code,
        channel=channel_str,
    )
    db.add(activity)
    await db.flush()

    reminder = None
    if auto_schedule_followup and template and template.follow_up_template_code and template.follow_up_days:
        parts = [contact.name]
        if contact.company:
            parts.append(contact.company)
        title = f"Takip ({template.follow_up_template_code}): " + " - ".join(parts)
        remind_at = datetime.utcnow() + timedelta(days=template.follow_up_days)
        reminder = Reminder(contact_id=contact.id, title=title, remind_at=remind_at)
        db.add(reminder)
        await db.flush()

    return activity, reminder


async def set_outcome(db: AsyncSession, activity: Activity, outcome: str) -> Reminder | None:
    """Bir temasın cevabı işaretlendikçe çağrılır; gerekirse bir sonraki
    adım için otomatik hatırlatıcı açar veya kişiyi pasife alır."""
    activity.outcome = outcome
    await db.flush()

    contact_res = await db.execute(select(Contact).where(Contact.id == activity.contact_id))
    contact = contact_res.scalar_one()
    name_parts = [contact.name] + ([contact.company] if contact.company else [])
    name_label = " - ".join(name_parts)

    reminder = None
    if outcome == "replied_positive" and activity.template_code == "T3":
        reminder = Reminder(
            contact_id=contact.id,
            title=f"Takip (T4): {name_label}",
            remind_at=datetime.utcnow() + timedelta(days=1),
        )
        db.add(reminder)
        await db.flush()
    elif outcome == "meeting_booked":
        reminder = Reminder(
            contact_id=contact.id,
            title=f"Görüşme özeti (T8): {name_label}",
            remind_at=datetime.utcnow(),
        )
        db.add(reminder)
        await db.flush()
    elif outcome == "replied_negative":
        contact.is_passive = True
        contact.passive_since = datetime.utcnow()
        await db.flush()

    return reminder


async def reactivate_contact(db: AsyncSession, contact: Contact) -> None:
    contact.is_passive = False
    contact.passive_since = None
    await db.flush()


async def mark_passive(db: AsyncSession, contact: Contact) -> None:
    """Elle 'pasife al' işlemi — otomatik zamanlayıcının önüne geçer."""
    contact.is_passive = True
    contact.passive_since = datetime.utcnow()
    await db.flush()
