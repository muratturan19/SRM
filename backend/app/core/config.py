from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional, List

# Backend package root: …/backend/app/core/config.py → …/backend
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/kolektif360_crm"
    database_url_sync: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/kolektif360_crm"

    # LLM APIs
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    # "claude" or "gpt" — falls back to the other if primary fails
    scan_provider: str = "claude"

    # File storage (absolute path so it works regardless of cwd)
    upload_dir: str = str(_BACKEND_DIR / "uploads")

    # CORS — tüm localhost portlarına izin ver (dev ortamı)
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
    ]

    app_name: str = "Kolektif360 CRM"

    model_config = {
        "env_file": str(_BACKEND_DIR / "data" / ".env"),
        "env_file_encoding": "utf-8",
    }


settings = Settings()
