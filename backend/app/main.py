import os
import sys
import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine, Base
from app.api.routes import contacts, deals, reminders, scan, dashboard, backup, activities, voice
from app.api.routes import settings_route
import app.models.settings  # ensure SystemSettings table is created by create_all
import app.models.activity   # ensure activities table is created by create_all
from app.services.reminder_scheduler import start_scheduler, stop_scheduler


def _find_frontend_static() -> Path | None:
    """
    Üretimde (frozen): PyInstaller _MEIPASS/static/
    Geliştirmede: frontend/dist/ (varsa)
    """
    if getattr(sys, "frozen", False):
        p = Path(sys._MEIPASS) / "static"  # type: ignore[attr-defined]
        return p if p.is_dir() else None
    # Dev: repo kökü / frontend / dist
    p = (Path(__file__).resolve().parent.parent.parent.parent / "frontend" / "dist")
    return p if p.is_dir() else None


logger = logging.getLogger(__name__)


async def _ensure_database_ready(max_attempts: int = 30, delay: float = 2.0) -> None:
    """
    PostgreSQL servisi (özellikle Windows boot'unda veya kurulumdan hemen sonra)
    bağlantı kabul etmeye geç hazır olabilir ve hedef veritabanı henüz oluşmamış
    olabilir. 'postgres' bakım veritabanına bağlanıp PG hazır olana kadar bekler,
    hedef veritabanı yoksa oluşturur. Böylece servis hem kurulumda hem de her
    açılışta kendi kendine toparlanır (installer'daki yarış durumuna bağımlı kalmaz).
    """
    import asyncpg
    from sqlalchemy.engine.url import make_url

    url = make_url(settings.database_url)
    target_db = url.database
    host = url.host or "localhost"
    port = url.port or 5432

    last_err = None
    for attempt in range(1, max_attempts + 1):
        try:
            conn = await asyncpg.connect(
                host=host, port=port, user=url.username,
                password=url.password, database="postgres",
            )
            try:
                exists = await conn.fetchval(
                    "SELECT 1 FROM pg_database WHERE datname=$1", target_db
                )
                if not exists:
                    await conn.execute(f'CREATE DATABASE "{target_db}"')
                    logger.info("Veritabanı oluşturuldu: %s", target_db)
            finally:
                await conn.close()
            return
        except Exception as exc:  # noqa: BLE001 — PG hazır değil / geçici hata
            last_err = exc
            logger.warning(
                "PostgreSQL hazır değil (deneme %d/%d): %s", attempt, max_attempts, exc
            )
            await asyncio.sleep(delay)

    raise RuntimeError(
        f"PostgreSQL'e bağlanılamadı veya veritabanı oluşturulamadı: {last_err}"
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(Path(settings.data_dir) / "backups", exist_ok=True)
    # PG hazır olana kadar bekle + hedef DB yoksa oluştur
    await _ensure_database_ready()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    start_scheduler()
    yield
    # ── Shutdown ─────────────────────────────────────────────────
    stop_scheduler()


app = FastAPI(
    title=settings.app_name,
    version="1.3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads directory exists before mounting static files
os.makedirs(settings.upload_dir, exist_ok=True)

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# ── Routers ───────────────────────────────────────────────────────
app.include_router(contacts.router, prefix="/api/contacts", tags=["contacts"])
app.include_router(deals.router, prefix="/api/deals", tags=["deals"])
app.include_router(reminders.router, prefix="/api/reminders", tags=["reminders"])
app.include_router(scan.router, prefix="/api/scan", tags=["scan"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(settings_route.router, prefix="/api/settings", tags=["settings"])
app.include_router(backup.router, prefix="/api/admin", tags=["admin"])
app.include_router(activities.router, prefix="/api/activities", tags=["activities"])
app.include_router(voice.router, prefix="/api/voice", tags=["voice"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": settings.app_name, "version": "1.3.0"}


# ── Frontend (SPA) — EN SON mount edilmeli ────────────────────────
# Üretimde: PyInstaller paketinden gelen dist/
# Geliştirmede: frontend/dist/ build edilmişse serve eder, yoksa atlar
_static = _find_frontend_static()
if _static:
    app.mount("/", StaticFiles(directory=str(_static), html=True), name="frontend")

