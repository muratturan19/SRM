import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine, Base
from app.api.routes import contacts, deals, reminders, scan, dashboard
from app.api.routes import settings_route
import app.models.settings  # ensure SystemSettings table is created by create_all
from app.services.reminder_scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────
    os.makedirs(settings.upload_dir, exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    start_scheduler()
    yield
    # ── Shutdown ─────────────────────────────────────────────────
    stop_scheduler()


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
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

# Serve uploaded files — mounted after startup so the directory is guaranteed to exist
def _mount_static() -> None:
    app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

_mount_static()

# ── Routers ───────────────────────────────────────────────────────
app.include_router(contacts.router, prefix="/api/contacts", tags=["contacts"])
app.include_router(deals.router, prefix="/api/deals", tags=["deals"])
app.include_router(reminders.router, prefix="/api/reminders", tags=["reminders"])
app.include_router(scan.router, prefix="/api/scan", tags=["scan"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(settings_route.router, prefix="/api/settings", tags=["settings"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": settings.app_name, "version": "1.0.0"}
