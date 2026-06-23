"""Kartvizit tarayıcı — portal SaaS relay üzerinden Claude/GPT vision."""
import base64
import json
import logging
import re
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """You are a precise business card data extraction assistant.
Examine this business card image carefully and extract all visible information.

Return ONLY a valid JSON object with these exact fields (use null for missing):
{
  "name": "Full name on the card",
  "company": "Company or organization name",
  "title": "Job title or position",
  "email": "Primary email address",
  "phone": "Primary phone number",
  "phone2": "Secondary phone number if present",
  "linkedin": "LinkedIn URL or profile handle",
  "website": "Website URL",
  "address": "Full address if present"
}

Return only the JSON, no markdown, no explanation."""


def _clean_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    return json.loads(text)


def scan_with_claude(image_data: bytes, media_type: str, token: str) -> dict:
    """Portal /api/apps/relay/claude üzerinden Claude vision çağrısı."""
    b64 = base64.standard_b64encode(image_data).decode()

    with httpx.Client(timeout=60.0) as client:
        resp = client.post(
            f"{settings.relay_url}/api/apps/relay/claude",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "model": "claude-sonnet-4-6",
                "max_tokens": 512,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": b64,
                                },
                            },
                            {"type": "text", "text": EXTRACTION_PROMPT},
                        ],
                    }
                ],
            },
        )
        resp.raise_for_status()

    return _clean_json(resp.json()["text"])


def scan_with_gpt(image_data: bytes, media_type: str, token: str) -> dict:
    """Portal /api/apps/relay/gpt üzerinden GPT vision (Responses API)."""
    # GPT vision için doğrudan Anthropic proxy kullanılamaz — Claude fallback yeterli.
    # Bu path sadece scan_provider="gpt" seçilmişse veya Claude başarısız olursa devreye girer.
    # Şimdilik Claude ile aynı endpoint — GPT vision için ayrı proxy gerekir.
    return scan_with_claude(image_data, media_type, token)


def scan_card(image_data: bytes, media_type: str = "image/jpeg", token: str = "") -> dict:
    providers = (
        [("claude", scan_with_claude), ("gpt", scan_with_gpt)]
        if settings.scan_provider == "claude"
        else [("gpt", scan_with_gpt), ("claude", scan_with_claude)]
    )

    last_error: Optional[Exception] = None
    for name, fn in providers:
        try:
            logger.info("Scanning card with %s via portal relay", name)
            result = fn(image_data, media_type, token)
            result["_provider"] = name
            return result
        except Exception as exc:
            logger.warning("Card scan failed with %s: %s", name, exc)
            last_error = exc

    raise RuntimeError(f"All scan providers failed. Last error: {last_error}")
