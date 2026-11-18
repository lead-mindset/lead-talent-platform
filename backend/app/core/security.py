"""Validación del JWT de Supabase Auth.

El frontend inicia sesión con Supabase (Google o email) y manda el access token
en el header Authorization. El backend lo valida y obtiene el usuario.
"""

from dataclasses import dataclass, field
from functools import lru_cache
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import Settings, get_settings

_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthUser:
    id: str
    email: str | None
    app_roles: dict[str, list[str]] = field(default_factory=dict)

    def has_role(self, app: str, role: str) -> bool:
        return role in self.app_roles.get(app, [])


@lru_cache
def _jwks_client(url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(url, cache_keys=True)


def decode_token(token: str, settings: Settings) -> AuthUser:
    try:
        alg = jwt.get_unverified_header(token).get("alg")
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido") from exc
    if alg == "HS256" and not settings.supabase_jwt_secret:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "El proyecto firma tokens con HS256: configura SUPABASE_JWT_SECRET en backend/.env",
        )
    try:
        if alg == "HS256":
            claims = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        else:
            key = _jwks_client(settings.jwks_url).get_signing_key_from_jwt(token).key
            claims = jwt.decode(
                token,
                key,
                algorithms=["RS256", "ES256"],
                audience="authenticated",
                issuer=settings.jwt_issuer,
            )
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Token inválido: {exc}") from exc

    sub = claims.get("sub")
    if not sub:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token sin usuario")

    roles = claims.get("app_roles") or {}
    return AuthUser(id=sub, email=claims.get("email"), app_roles=roles)


def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthUser:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Falta el token")
    return decode_token(creds.credentials, settings)


CurrentUser = Annotated[AuthUser, Depends(get_current_user)]
