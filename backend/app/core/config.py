from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Portal SSO
    portal_url: str = "https://portal.kolektif360.com"
    portal_issuer: str = "https://portal.kolektif360.com"
    portal_app_slug: str = "operon_crm"

    # Tüm LLM + STT çağrıları portal SaaS relay üzerinden — API key yok
    relay_url: str = "https://portal.kolektif360.com"

    # Database bağlantı bileşenleri
    database_host: str = "localhost"
    database_port: int = 5432
    database_user: str = "postgres"
    database_password: str = "postgres"
    tenant_db_suffix: str = "operon_crm"
    legacy_tenant_db_suffix: str = "srm"

    # Sağlayıcı tercihleri
    scan_provider: str = "claude"
    voice_llm_provider: str = "claude"
    voice_llm_model: str = "claude-sonnet-4-6"
    voice_llm_fallback_model: str = "gpt-5.5"
    openai_transcribe_model: str = "gpt-4o-mini-transcribe"

    upload_dir: str = "./uploads"
    data_dir: str = "./data"

    cors_origins: List[str] = [
        "https://operon-crm.kolektif360.com",
        "https://srm.kolektif360.com",
        "http://localhost:5173",
        "http://localhost:5174",
    ]

    app_name: str = "Operon_CRM"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }

    def tenant_db_name(self, tenant_slug: str, suffix: str | None = None) -> str:
        return f"tenant_{tenant_slug}_{suffix or self.tenant_db_suffix}"

    def tenant_db_url(self, tenant_slug: str, db_name: str | None = None) -> str:
        db = db_name or self.tenant_db_name(tenant_slug)
        return (
            f"postgresql+asyncpg://{self.database_user}:{self.database_password}"
            f"@{self.database_host}:{self.database_port}/{db}"
        )


settings = Settings()
