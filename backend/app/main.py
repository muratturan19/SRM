import os
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.database import Base
from app.api.routes import contacts, deals, reminders, scan, dashboard, backup, activities, voice
from app.api.routes import settings_route
from app.api.sso import router as sso_router
import app.models.settings
import app.models.activity
from app.services.reminder_scheduler import start_scheduler, stop_scheduler


def _find_frontend_static() -> Path | None:
    """Docker: /frontend/dist  |  Dev: bulunamazsa None (Vite ayrı çalışır)."""
    override = os.getenv("FRONTEND_DIST_DIR")
    if override:
        p = Path(override)
        return p if p.is_dir() else None
    p = Path("/frontend/dist")
    if p.is_dir():
        return p
    p = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
    return p if p.is_dir() else None


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.upload_dir, exist_ok=True)
    import asyncpg
    for attempt in range(30):
        try:
            conn = await asyncpg.connect(
                host=settings.database_host,
                port=settings.database_port,
                user=settings.database_user,
                password=settings.database_password,
                database="postgres",
            )
            await conn.close()
            break
        except Exception as exc:
            logger.warning("PostgreSQL hazır değil (%d/30): %s", attempt + 1, exc)
            import asyncio
            await asyncio.sleep(2)
    else:
        raise RuntimeError("PostgreSQL'e bağlanılamadı.")
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title=settings.app_name,
    version="1.3.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# SSO — auth gerektirmeyen tek endpoint
app.include_router(sso_router, prefix="/api")

# API route'ları
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


# Frontend SPA — SADECE /assets prefix'i mount edilir.
# Diğer tüm bilinmeyen path'ler exception handler'a düşer.
_static = _find_frontend_static()
if _static:
    _assets_dir = _static / "assets"
    if _assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")


@app.exception_handler(StarletteHTTPException)
async def _spa_fallback(request: Request, exc: StarletteHTTPException):
    """
    404 → API dışı path'ler için index.html (React Router devralır).
          /api/* ve /uploads/* için normal JSON hata döner.
    """
    if exc.status_code == 404 and _static:
        path = request.url.path
        if not path.startswith("/api/") and not path.startswith("/uploads/") and not path.startswith("/assets/"):
            # favicon, manifest gibi gerçek dosyaları dene
            filename = path.lstrip("/")
            if filename:
                candidate = _static / filename
                if candidate.is_file():
                    return FileResponse(str(candidate))
            return FileResponse(str(_static / "index.html"))
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)
