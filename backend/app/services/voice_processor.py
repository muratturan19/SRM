"""
Sesli giriş işleyici — tüm çağrılar portal SaaS relay üzerinden.

① Ses → Metin (STT): portal /api/apps/relay/stt (OpenAI platform key)
② Metin → Niyet/alanlar: portal /api/apps/relay/claude
"""
import base64
import json
import logging
import re
from datetime import datetime
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


# ── ① STT — portal relay üzerinden ───────────────────────────────────────────

def transcribe(audio: bytes, filename: str = "voice.webm", token: str = "") -> str:
    """Ses verisini portal relay STT endpoint'i ile metne çevirir."""
    audio_b64 = base64.b64encode(audio).decode()

    with httpx.Client(timeout=120.0) as client:
        resp = client.post(
            f"{settings.relay_url}/api/apps/relay/stt",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "audio_b64": audio_b64,
                "filename": filename,
                "language": "tr",
                "model": settings.openai_transcribe_model,
            },
        )
        resp.raise_for_status()

    return (resp.json().get("text") or "").strip()


# ── ② Niyet + alan çıkarımı — portal relay ───────────────────────────────────

_EXTRACTION_SYSTEM = """Sen bir CRM asistanısın. Kullanıcının (Selin) Türkçe sesli notunu \
analiz edip yapılandırılmış JSON üretirsin. Niyeti şu üçünden biri olarak sınıflandır:

- "new_contact": Yeni bir kişi/müşteri kaydı oluşturma (isim, telefon, e-posta, şirket vb. anlatır).
- "contact_note": MEVCUT bir kişiyle yapılan görüşmeyi/notu kaydetme ("Ahmet'le görüştüm, ...").
- "reminder": Gelecekte bir hatırlatıcı ("yarın 15:00'te X'i ara", "salı günü teklif gönder").

SADECE şu yapıda geçerli bir JSON döndür (eksik alanlar için null kullan, markdown YOK):
{
  "intent": "new_contact" | "contact_note" | "reminder",
  "contact": {
    "name": null, "company": null, "title": null, "email": null,
    "phone": null, "phone2": null, "linkedin": null, "website": null,
    "address": null, "notes": null, "tags": null
  },
  "note": {
    "target_name": null,
    "type": "call" | "meeting" | "email" | "note" | "task",
    "content": null
  },
  "reminder": {
    "target_name": null,
    "title": null,
    "remind_at": null
  }
}

Kurallar:
- intent ne olursa olsun yalnızca ilgili bölümü doldur; diğerleri null/boş kalsın.
- Telefon/numaraları RAKAMA çevir.
- E-posta için "at"→"@", "nokta"→"." dönüşümünü uygula.
- reminder için: remind_at = ISO 8601 yerel saat (saniyesiz, tz yok).
- Emin değilsen makul tahmin yap; asla JSON dışına çıkma."""


def _clean_json(text: str) -> dict:
    text = (text or "").strip()
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    return json.loads(text)


def _build_user_prompt(transcript: str, now: datetime) -> str:
    ref = now.strftime("%Y-%m-%dT%H:%M:%S")
    weekday_tr = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"][now.weekday()]
    return (
        f"Referans şu an (yerel saat): {ref} ({weekday_tr}).\n\n"
        f"Sesli not metni:\n\"\"\"\n{transcript}\n\"\"\""
    )


def _extract_claude(transcript: str, now: datetime, token: str) -> dict:
    with httpx.Client(timeout=60.0) as client:
        resp = client.post(
            f"{settings.relay_url}/api/apps/relay/claude",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "model": settings.voice_llm_model,
                "max_tokens": 700,
                "system": _EXTRACTION_SYSTEM,
                "user": _build_user_prompt(transcript, now),
            },
        )
        resp.raise_for_status()
    return _clean_json(resp.json()["text"])


def _extract_gpt(transcript: str, now: datetime, token: str) -> dict:
    with httpx.Client(timeout=60.0) as client:
        resp = client.post(
            f"{settings.relay_url}/api/apps/relay/gpt",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "model": settings.voice_llm_fallback_model,
                "max_tokens": 700,
                "system": _EXTRACTION_SYSTEM,
                "user": _build_user_prompt(transcript, now),
            },
        )
        resp.raise_for_status()
    return _clean_json(resp.json()["text"])


def extract(transcript: str, now: Optional[datetime] = None, token: str = "") -> dict:
    now = now or datetime.now()
    providers = (
        [("claude", _extract_claude), ("gpt", _extract_gpt)]
        if (settings.voice_llm_provider or "claude").lower() == "claude"
        else [("gpt", _extract_gpt), ("claude", _extract_claude)]
    )

    last_error: Optional[Exception] = None
    for name, fn in providers:
        try:
            logger.info("Voice extract via %s portal relay", name)
            data = fn(transcript, now, token)
            data.setdefault("intent", "new_contact")
            data.setdefault("contact", {})
            data.setdefault("note", {})
            data.setdefault("reminder", {})
            data["_provider"] = name
            return data
        except Exception as exc:
            logger.warning("Voice extract failed with %s: %s", name, exc)
            last_error = exc

    raise RuntimeError(f"Tüm çıkarım sağlayıcıları başarısız. Son hata: {last_error}")
