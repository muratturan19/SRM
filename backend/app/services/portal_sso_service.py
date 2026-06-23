"""Portal SSO JWT doğrulama — Platform standardı."""
import logging
import os
from typing import Optional, Dict
from datetime import datetime, timezone

import httpx
from jose import jwt, JWTError

from app.core.config import settings

logger = logging.getLogger(__name__)


class PortalSSOService:
    _public_key_cache: Optional[str] = None
    _public_key_cache_time: Optional[datetime] = None
    CACHE_TTL_HOURS = 1

    @classmethod
    async def get_public_key(cls, force_refresh: bool = False) -> str:
        if not force_refresh and cls._public_key_cache and cls._public_key_cache_time:
            age = (datetime.now(timezone.utc) - cls._public_key_cache_time).total_seconds() / 3600
            if age < cls.CACHE_TTL_HOURS:
                return cls._public_key_cache

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{settings.portal_url}/api/.well-known/jwt-public-key.pem",
                timeout=10.0,
            )
            resp.raise_for_status()
            public_key = resp.json()["public_key"]

        cls._public_key_cache = public_key
        cls._public_key_cache_time = datetime.now(timezone.utc)
        logger.info("Portal public key fetched and cached")
        return public_key

    @classmethod
    async def validate_token(cls, token: str) -> Dict:
        try:
            public_key = await cls.get_public_key()
        except Exception as e:
            if cls._public_key_cache:
                logger.warning("Stale portal public key in use: %s", e)
                public_key = cls._public_key_cache
            else:
                raise ValueError(f"Portal public key alınamadı: {e}")

        try:
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                audience=settings.portal_app_slug,
                issuer=settings.portal_issuer,
            )
            logger.info(
                "Token OK — user=%s tenant=%s",
                payload.get("username"),
                payload.get("tenant_slug"),
            )
            return payload
        except JWTError:
            # İmza hatası: portal key rotasyonu olmuş olabilir — cache'i temizle ve bir kez daha dene
            logger.warning("Token doğrulama başarısız, portal public key yenileniyor...")
            try:
                public_key = await cls.get_public_key(force_refresh=True)
                payload = jwt.decode(
                    token,
                    public_key,
                    algorithms=["RS256"],
                    audience=settings.portal_app_slug,
                    issuer=settings.portal_issuer,
                )
                logger.info(
                    "Token OK (yenilenen key ile) — user=%s tenant=%s",
                    payload.get("username"),
                    payload.get("tenant_slug"),
                )
                return payload
            except JWTError as e:
                raise ValueError(f"Geçersiz token: {e}")
