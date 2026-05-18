"""
Business card scanner service.
Primary: Claude Sonnet 4.6 vision
Fallback: GPT-5.5 vision via Responses API
"""
import base64
import json
import logging
import re
from typing import Optional
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
    """Strip markdown code fences and parse JSON."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    return json.loads(text)


def scan_with_claude(image_data: bytes, media_type: str) -> dict:
    """Call Claude Sonnet 4.6 vision API."""
    import anthropic

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    b64 = base64.standard_b64encode(image_data).decode()

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[
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
    )
    return _clean_json(message.content[0].text)


def scan_with_gpt(image_data: bytes, media_type: str) -> dict:
    """Call GPT-5.5 via Responses API with vision."""
    from openai import OpenAI

    client = OpenAI(api_key=settings.openai_api_key)
    b64 = base64.standard_b64encode(image_data).decode()
    data_url = f"data:{media_type};base64,{b64}"

    response = client.responses.create(
        model="gpt-5.5",
        input=[
            {
                "role": "user",
                "content": [
                    {"type": "input_image", "image_url": data_url},
                    {"type": "input_text", "text": EXTRACTION_PROMPT},
                ],
            }
        ],
    )
    return _clean_json(response.output_text)


def scan_card(image_data: bytes, media_type: str = "image/jpeg") -> dict:
    """
    Scan a business card image and extract structured contact data.
    Tries primary provider first, falls back to the other on error.
    """
    providers = (
        [("claude", scan_with_claude), ("gpt", scan_with_gpt)]
        if settings.scan_provider == "claude"
        else [("gpt", scan_with_gpt), ("claude", scan_with_claude)]
    )

    last_error: Optional[Exception] = None
    for name, fn in providers:
        if name == "claude" and not settings.anthropic_api_key:
            continue
        if name == "gpt" and not settings.openai_api_key:
            continue
        try:
            logger.info("Scanning card with %s", name)
            result = fn(image_data, media_type)
            result["_provider"] = name
            return result
        except Exception as exc:
            logger.warning("Card scan failed with %s: %s", name, exc)
            last_error = exc

    raise RuntimeError(
        f"All scan providers failed. Last error: {last_error}"
    )
