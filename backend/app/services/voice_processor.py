"""
Sesli giriş işleyici (voice input processor).

İki aşama:
  ① Ses → Metin (STT)
       - Birincil: OpenAI gpt-4o-mini-transcribe  (Haz 2026 güncel model)
       - Alternatif: ElevenLabs Scribe v2          (en yüksek Türkçe doğruluğu)
  ② Metin → Yapılandırılmış niyet/alanlar (Claude Sonnet 4.6)
       intent ∈ { new_contact | contact_note | reminder }

Çıktı her zaman gözden geçirilmek üzere frontend'e döner; doğrudan kayıt yapılmaz.
"""
import io
import json
import logging
import re
from datetime import datetime
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


# ── ① STT ─────────────────────────────────────────────────────────────────────
def _transcribe_openai(audio: bytes, filename: str) -> str:
    """OpenAI gpt-4o-mini-transcribe ile Türkçe transkripsiyon."""
    from openai import OpenAI

    client = OpenAI(api_key=settings.openai_api_key)
    result = client.audio.transcriptions.create(
        model=settings.openai_transcribe_model,
        file=(filename, audio),
        language="tr",
    )
    return (result.text or "").strip()


def _transcribe_elevenlabs(audio: bytes, filename: str) -> str:
    """ElevenLabs Scribe ile transkripsiyon (httpx REST — ek bağımlılık yok)."""
    resp = httpx.post(
        "https://api.elevenlabs.io/v1/speech-to-text",
        headers={"xi-api-key": settings.elevenlabs_api_key or ""},
        data={"model_id": settings.elevenlabs_stt_model, "language_code": "tur"},
        files={"file": (filename, audio)},
        timeout=120.0,
    )
    resp.raise_for_status()
    return (resp.json().get("text") or "").strip()


def transcribe(audio: bytes, filename: str = "voice.webm") -> str:
    """Ses verisini metne çevirir. Sağlayıcı config.voice_stt_provider ile seçilir."""
    provider = (settings.voice_stt_provider or "openai").lower()
    if provider == "elevenlabs":
        if not settings.elevenlabs_api_key:
            raise RuntimeError("ElevenLabs API anahtarı tanımlı değil.")
        return _transcribe_elevenlabs(audio, filename)
    # default: openai
    if not settings.openai_api_key:
        raise RuntimeError("OpenAI API anahtarı tanımlı değil.")
    return _transcribe_openai(audio, filename)


# ── ② Niyet + alan çıkarımı (Claude) ────────────────────────────────────────────
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
- Telefon/numaraları RAKAMA çevir: sözle söylenen Türkçe sayıları ("sıfır beş yüz otuz iki…")
  ardışık rakamlara dönüştür (örn "0532..."), boşlukları koru; formatı sistem ayrıca düzeltir.
- E-posta için "at"→"@", "nokta"→"." dönüşümünü uygula (örn "ahmet at abc nokta com" → "ahmet@abc.com").
- contact_note için: target_name = bahsedilen kişinin adı; type görüşme şekline göre seç
  (telefon=call, yüz yüze/toplantı=meeting, e-posta=email, yapılacak iş=task, diğer=note);
  content = görüşmenin/notun özeti (Türkçe, anlamlı bir cümle).
- reminder için: title = kısa eylem ("Ahmet'i ara"); remind_at = ISO 8601 YEREL saat,
  saniyesiz, saat dilimi EKLEME (örn "2026-06-20T15:00:00"). Saat belirtilmemişse 09:00 kullan.
  Göreli ifadeleri (bugün/yarın/öbür gün/haftaya/pazartesi…) aşağıdaki referans ana göre çöz.
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


def _extract_claude(transcript: str, now: datetime) -> dict:
    import anthropic

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model=settings.voice_llm_model,
        max_tokens=700,
        system=_EXTRACTION_SYSTEM,
        messages=[{"role": "user", "content": _build_user_prompt(transcript, now)}],
    )
    return _clean_json(message.content[0].text)


def _extract_gpt(transcript: str, now: datetime) -> dict:
    """OpenAI Responses API ile yedek çıkarım (kartvizit tarama ile aynı desen)."""
    from openai import OpenAI

    client = OpenAI(api_key=settings.openai_api_key)
    response = client.responses.create(
        model=settings.voice_llm_fallback_model,
        input=[
            {"role": "system", "content": _EXTRACTION_SYSTEM},
            {"role": "user", "content": _build_user_prompt(transcript, now)},
        ],
    )
    return _clean_json(response.output_text)


def extract(transcript: str, now: Optional[datetime] = None) -> dict:
    """
    Transkripti niyet + alanlara ayırır.
    Birincil: Claude; başarısız olursa OpenAI GPT'ye düşer (kartvizit taramadaki gibi).
    """
    now = now or datetime.now()

    providers = (
        [("claude", _extract_claude), ("gpt", _extract_gpt)]
        if (settings.voice_llm_provider or "claude").lower() == "claude"
        else [("gpt", _extract_gpt), ("claude", _extract_claude)]
    )

    last_error: Optional[Exception] = None
    for name, fn in providers:
        if name == "claude" and not settings.anthropic_api_key:
            continue
        if name == "gpt" and not settings.openai_api_key:
            continue
        try:
            logger.info("Voice extract via %s", name)
            data = fn(transcript, now)
            # Garanti: beklenen anahtarlar her zaman bulunsun
            data.setdefault("intent", "new_contact")
            data.setdefault("contact", {})
            data.setdefault("note", {})
            data.setdefault("reminder", {})
            data["_provider"] = name
            return data
        except Exception as exc:  # noqa: BLE001
            logger.warning("Voice extract failed with %s: %s", name, exc)
            last_error = exc

    raise RuntimeError(f"Tüm çıkarım sağlayıcıları başarısız. Son hata: {last_error}")
