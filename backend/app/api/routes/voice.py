"""
Sesli giriş endpoint'i.

POST /api/voice/process
    - Ses dosyası alır (webm/ogg/mp3/wav/m4a)
    - Transkripsiyon + niyet/alan çıkarımı yapar
    - contact_note / reminder için bahsedilen kişiyi mevcut kayıtlarla eşleştirir
    - Sonucu döndürür (kayıt YAPMAZ — frontend gözden geçirip onaylar)
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.auth import get_access_token
from app.core.database import get_db
from app.core.phone_utils import normalize_phone
from app.models.contact import Contact
from app.services import voice_processor

router = APIRouter()

# OpenAI 25 MB sınırı; pratikte sesli notlar çok daha küçük
MAX_AUDIO_BYTES = 25 * 1024 * 1024

_PHONE_FIELDS = ("phone", "phone2")


async def _match_contacts(db: AsyncSession, name: str | None, limit: int = 5) -> list[dict]:
    """İsme göre mevcut kişileri bulur (contact_note / reminder hedefi için)."""
    if not name or not name.strip():
        return []
    term = f"%{name.strip()}%"
    res = await db.execute(
        select(Contact)
        .where(or_(Contact.name.ilike(term), Contact.company.ilike(term)))
        .limit(limit)
    )
    return [
        {"id": str(c.id), "name": c.name, "company": c.company, "phone": c.phone, "email": c.email}
        for c in res.scalars().all()
    ]


@router.post("/process")
async def process_voice(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    token: str = Depends(get_access_token),
):
    audio = await file.read()
    if not audio:
        raise HTTPException(status_code=400, detail="Boş ses dosyası.")
    if len(audio) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=400, detail="Ses dosyası çok büyük (maks 25 MB).")

    filename = file.filename or "voice.webm"

    # ① Transkripsiyon
    try:
        transcript = voice_processor.transcribe(audio, filename, token=token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"Ses metne çevrilemedi: {exc}")

    if not transcript:
        raise HTTPException(status_code=422, detail="Ses anlaşılamadı, lütfen tekrar deneyin.")

    # ② Niyet + alan çıkarımı
    try:
        result = voice_processor.extract(transcript, token=token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"Metin çözümlenemedi: {exc}")

    result["transcript"] = transcript

    # Telefon numaralarını normalize et
    contact = result.get("contact") or {}
    for f in _PHONE_FIELDS:
        if contact.get(f):
            contact[f] = normalize_phone(contact[f])
    result["contact"] = contact

    # Hedef kişi eşleştirme (note / reminder)
    intent = result.get("intent")
    if intent == "contact_note":
        target = (result.get("note") or {}).get("target_name")
        result["contact_matches"] = await _match_contacts(db, target)
    elif intent == "reminder":
        target = (result.get("reminder") or {}).get("target_name")
        result["contact_matches"] = await _match_contacts(db, target)
    else:
        result["contact_matches"] = []

    return result
