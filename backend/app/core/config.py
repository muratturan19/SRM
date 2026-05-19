import os
import sys
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional, List


def _resolve_data_dir() -> Path:
    """
    Üretimde (PyInstaller frozen): SRM_DATA_DIR env → C:\\ProgramData\\KolektifSRM
    Geliştirmede: backend/ klasörü
    """
    if getattr(sys, "frozen", False):
        env_dir = os.environ.get("SRM_DATA_DIR")
        return Path(env_dir) if env_dir else Path(r"C:\ProgramData\KolektifSRM")
    # Dev: …/backend/app/core/config.py → …/backend
    return Path(__file__).resolve().parent.parent.parent


_DATA_DIR = _resolve_data_dir()


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/kolektif360_crm"
    database_url_sync: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/kolektif360_crm"

    # LLM APIs
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    # "claude" or "gpt" — falls back to the other if primary fails
    scan_provider: str = "claude"

    # Veri dizini (uploads, logs, backups) — .env'den override edilebilir
    data_dir: str = str(_DATA_DIR)

    # File storage (absolute path so it works regardless of cwd)
    upload_dir: str = str(_DATA_DIR / "uploads")

    # CORS — tüm localhost portlarına izin ver (dev ortamı)
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
    ]

    app_name: str = "Kolektif360 SRM"

    model_config = {
        "env_file": str(_DATA_DIR / "data" / ".env"),
        "env_file_encoding": "utf-8",
    }


settings = Settings()
