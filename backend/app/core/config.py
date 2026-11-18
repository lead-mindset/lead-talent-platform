from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = "http://localhost:54321"
    supabase_secret_key: str = ""
    supabase_jwt_secret: str = ""
    database_url: str = "postgresql://postgres:postgres@localhost:54322/postgres"
    cors_origins: str = "http://localhost:3000"

    resume_bucket: str = "resumes"
    resume_max_bytes: int = 10 * 1024 * 1024
    signed_url_seconds: int = 300

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def jwks_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"

    @property
    def jwt_issuer(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()
