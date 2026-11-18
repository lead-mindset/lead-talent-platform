"""Cliente mínimo de Supabase Storage.

El navegador sube el archivo directo a Storage con una URL firmada.
El backend nunca recibe los bytes del resume.
"""

from typing import Annotated, Protocol

import httpx
from fastapi import Depends

from app.core.config import Settings, get_settings


class Storage(Protocol):
    def create_signed_upload_url(self, bucket: str, path: str) -> str: ...
    def create_signed_download_url(self, bucket: str, path: str, expires_in: int) -> str: ...


class SupabaseStorage:
    def __init__(self, settings: Settings) -> None:
        self._base = f"{settings.supabase_url.rstrip('/')}/storage/v1"
        # Las claves sb_secret_ no son JWT: van solo en el header apikey.
        # Si se mandan como "Authorization: Bearer", Supabase intenta validarlas
        # como JWT y rechaza el pedido.
        self._headers = {"apikey": settings.supabase_secret_key}

    def create_signed_upload_url(self, bucket: str, path: str) -> str:
        r = httpx.post(
            f"{self._base}/object/upload/sign/{bucket}/{path}", headers=self._headers, timeout=10
        )
        r.raise_for_status()
        return f"{self._base}{r.json()['url']}"

    def create_signed_download_url(self, bucket: str, path: str, expires_in: int) -> str:
        r = httpx.post(
            f"{self._base}/object/sign/{bucket}/{path}",
            headers=self._headers,
            json={"expiresIn": expires_in},
            timeout=10,
        )
        r.raise_for_status()
        return f"{self._base}{r.json()['signedURL']}"


def get_storage(settings: Annotated[Settings, Depends(get_settings)]) -> Storage:
    return SupabaseStorage(settings)
