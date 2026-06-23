"""Multi-tenant veritabanı — JWT'den tenant_slug alınır, tenant_{slug}_srm DB kullanılır."""
import logging
from typing import AsyncGenerator, Dict

from fastapi import Depends
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.auth import get_current_user
from app.core.config import settings

logger = logging.getLogger(__name__)

_engines: Dict[str, AsyncEngine] = {}
_session_makers: Dict[str, async_sessionmaker] = {}
_initialized: set = set()


class Base(DeclarativeBase):
    pass


def _get_engine(tenant_slug: str) -> AsyncEngine:
    if tenant_slug not in _engines:
        _engines[tenant_slug] = create_async_engine(
            settings.tenant_db_url(tenant_slug),
            echo=False,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
    return _engines[tenant_slug]


def _get_session_maker(tenant_slug: str) -> async_sessionmaker:
    if tenant_slug not in _session_makers:
        _session_makers[tenant_slug] = async_sessionmaker(
            _get_engine(tenant_slug),
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return _session_makers[tenant_slug]


async def ensure_tenant_db(tenant_slug: str) -> None:
    """Tenant DB yoksa oluştur, tabloları create_all ile hazırla."""
    if tenant_slug in _initialized:
        return

    import asyncpg

    db_name = f"tenant_{tenant_slug}_srm"
    conn = await asyncpg.connect(
        host=settings.database_host,
        port=settings.database_port,
        user=settings.database_user,
        password=settings.database_password,
        database="postgres",
    )
    try:
        exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname=$1", db_name)
        if not exists:
            await conn.execute(f'CREATE DATABASE "{db_name}"')
            logger.info("Tenant DB oluşturuldu: %s", db_name)
    finally:
        await conn.close()

    engine = _get_engine(tenant_slug)
    async with engine.begin() as conn:
        # Modeller Base'e register olmuş olmalı (import sırası)
        await conn.run_sync(Base.metadata.create_all)

    _initialized.add(tenant_slug)
    logger.info("Tenant DB hazır: %s", db_name)


async def get_db(
    user: dict = Depends(get_current_user),
) -> AsyncGenerator[AsyncSession, None]:
    tenant_slug = user.get("tenant_slug", "default")
    await ensure_tenant_db(tenant_slug)
    async with _get_session_maker(tenant_slug)() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
