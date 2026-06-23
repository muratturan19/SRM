from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Portal SSO
    portal_url: str = "https://portal.kolektif360.com"
    portal_issuer: str = "https://portal.kolektif360.com"
    portal_app_slug: str = "srm"

    # Tüm LLM + STT çağrıları portal SaaS relay üzerinden — API key yok
    relay_url: str = "https://portal.kolektif360.com"

    # Database bağlantı bileşenleri
    database_host: str = "localhost"
    database_port: int = 5432
    database_user: str = "postgres"
    database_password: str = "postgres"

    # Sağlayıcı tercihleri
    scan_provider: str = "claude"
    voice_llm_provider: str = "claude"
    voice_llm_model: str = "claude-sonnet-4-6"
    voice_llm_fallback_model: str = "gpt-5.5"
    openai_transcribe_model: str = "gpt-4o-mini-transcribe"

    upload_dir: str = "./uploads"

    cors_origins: List[str] = [
        "https://srm.kolektif360.com",
        "http://localhost:5173",
        "http://localhost:5174",
    ]

    app_name: str = "Kolektif360 SRM"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }

    def tenant_db_url(self, tenant_slug: str) -> str:
        db = f"tenant_{tenant_slug}_srm"
        return (
            f"postgresql+asyncpg://{self.database_user}:{self.database_password}"
            f"@{self.database_host}:{self.database_port}/{db}"
        )


settings = Settings()
