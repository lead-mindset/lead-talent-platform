from functools import lru_cache
from urllib.parse import urlsplit

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # env_ignore_empty: "LOG_CV_DEBUG=" (vacío, como en .env.example) usa el valor por defecto.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_ignore_empty=True)

    supabase_url: str = "http://localhost:54321"
    supabase_secret_key: str = ""
    supabase_jwt_secret: str = ""
    database_url: str = "postgresql://postgres:postgres@localhost:54322/postgres"
    cors_origins: str = "http://localhost:3000"

    resume_bucket: str = "resumes"
    resume_max_bytes: int = 10 * 1024 * 1024
    signed_url_seconds: int = 300

    # Ambiente: "local" en tu máquina. Cualquier otro valor se trata como desplegado.
    env: str = "production"
    # Registra el texto extraído del CV. Solo funciona si env == "local"; en otro ambiente se ignora.
    log_cv_debug: bool = False
    # Application Insights: el punto de envío está preparado en app/core/logging.py, todavía sin usar.
    applicationinsights_connection_string: str = ""

    # Lectura de CV con IA (Azure OpenAI en Microsoft Foundry), con una app de Entra ID.
    # Si falta alguna, la lectura con IA queda desactivada y el registro sigue a mano.
    azure_tenant_id: str = ""
    azure_client_id: str = ""
    azure_client_secret: str = ""
    foundry_endpoint: str = ""
    foundry_deployment: str = ""
    foundry_api_version: str = ""
    cv_ai_timeout_seconds: float = 30.0
    cv_parse_max_per_hour: int = 5
    cv_text_max_chars: int = 20_000

    @property
    def cv_ai_enabled(self) -> bool:
        return all(
            v.strip()
            for v in (
                self.azure_tenant_id,
                self.azure_client_id,
                self.azure_client_secret,
                self.foundry_endpoint,
                self.foundry_deployment,
            )
        )

    @property
    def foundry_base_url(self) -> str:
        # AzureOpenAI necesita solo esquema y host: arma él la ruta /openai/deployments/....
        # Así también sirve si FOUNDRY_ENDPOINT trae la URL completa que muestra el portal
        # (por ejemplo .../openai/v1/responses).
        parts = urlsplit(self.foundry_endpoint.strip())
        return f"{parts.scheme}://{parts.netloc}" if parts.scheme and parts.netloc else ""

    @property
    def foundry_api_version_or_default(self) -> str:
        # Versión con structured outputs y modelos gpt-5. Se puede cambiar con FOUNDRY_API_VERSION.
        return self.foundry_api_version.strip() or "2025-04-01-preview"

    @property
    def is_local(self) -> bool:
        return self.env.strip().lower() == "local"

    @property
    def cv_debug_allowed(self) -> bool:
        return self.log_cv_debug and self.is_local

    @property
    def api_docs_urls(self) -> dict[str, str | None]:
        # /docs, /redoc y /openapi.json solo en local. En QA y producción no se publica el contrato.
        if self.is_local:
            return {"docs_url": "/docs", "redoc_url": "/redoc", "openapi_url": "/openapi.json"}
        return {"docs_url": None, "redoc_url": None, "openapi_url": None}

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
