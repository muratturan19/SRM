import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine, Base
from app.api.routes import contacts, deals, reminders, scan, dashboard, backup, activities
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(Path(settings.data_dir) / "backups", exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    start_scheduler()
    yield
    # ── Shutdown ─────────────────────────────────────────────────
    stop_scheduler()


app = FastAPI(
    title=settings.app_name,
    version="1.2.1",
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


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": settings.app_name, "version": "1.2.1"}


# ── Frontend (SPA) — EN SON mount edilmeli ────────────────────────
# Üretimde: PyInstaller paketinden gelen dist/
# Geliştirmede: frontend/dist/ build edilmişse serve eder, yoksa atlar
_static = _find_frontend_static()
if _static:
    app.mount("/", StaticFiles(directory=str(_static), html=True), name="frontend")

