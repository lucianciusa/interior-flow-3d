from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", ".env.local"), extra="ignore")

    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_KEY: str = ""
    AZURE_OPENAI_DEPLOYMENT: str = "gpt-4o"
    AZURE_OPENAI_API_VERSION: str = "preview"

    SUPABASE_URL: str = ""
    SUPABASE_JWKS_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    SHARE_TOKEN_SECRET: str = ""
    SHARE_LINK_BASE_URL: str = ""
    SHARE_TOKEN_TTL_DAYS: int = 30

    CATALOG_VERSION: str = "v1.phase6"
    CDN_BASE_URL: str = ""

    # Comma-separated origins, e.g. "http://localhost:3000,https://example.com"
    CORS_ORIGINS: str = ""
    LOG_LEVEL: str = "info"

    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
