"""Validación del JWT de Supabase: secreto HS256 legacy y claves asimétricas (JWKS)."""

import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException

from app.core import security
from app.core.config import Settings

URL = "https://test-ref.supabase.co"
SECRET = "test-secret-at-least-32-characters-long"


def claims(**overrides):
    base = {
        "sub": "22222222-2222-2222-2222-222222222222",
        "email": "valeria@mail.com",
        "aud": "authenticated",
        "iss": f"{URL}/auth/v1",
        "exp": int(time.time()) + 3600,
        "app_roles": {"talent": ["student"]},
    }
    return {**base, **overrides}


# --------------------------------------------------------------- HS256 legacy
def test_hs256_token_with_secret_is_accepted():
    token = jwt.encode(claims(), SECRET, algorithm="HS256")
    user = security.decode_token(token, Settings(supabase_url=URL, supabase_jwt_secret=SECRET))
    assert user.id == "22222222-2222-2222-2222-222222222222"
    assert user.has_role("talent", "student")
    assert not user.has_role("talent", "admin")


def test_hs256_token_without_secret_explains_the_fix():
    token = jwt.encode(claims(), SECRET, algorithm="HS256")
    with pytest.raises(HTTPException) as exc:
        security.decode_token(token, Settings(supabase_url=URL, supabase_jwt_secret=""))
    assert exc.value.status_code == 401
    assert "SUPABASE_JWT_SECRET" in exc.value.detail


def test_garbage_token_is_rejected():
    with pytest.raises(HTTPException) as exc:
        security.decode_token("not-a-jwt", Settings(supabase_url=URL))
    assert exc.value.status_code == 401


def test_token_without_sub_is_rejected():
    token = jwt.encode(claims(sub=None), SECRET, algorithm="HS256")
    with pytest.raises(HTTPException):
        security.decode_token(token, Settings(supabase_url=URL, supabase_jwt_secret=SECRET))


def test_missing_app_roles_means_no_roles():
    payload = claims()
    payload.pop("app_roles")
    token = jwt.encode(payload, SECRET, algorithm="HS256")
    user = security.decode_token(token, Settings(supabase_url=URL, supabase_jwt_secret=SECRET))
    assert user.app_roles == {}


# ------------------------------------------------------------ ES256 via JWKS
class FakeJwksClient:
    def __init__(self, public_key):
        self.public_key = public_key

    def get_signing_key_from_jwt(self, token):
        return type("Key", (), {"key": self.public_key})()


@pytest.fixture
def es256(monkeypatch):
    private = ec.generate_private_key(ec.SECP256R1())
    monkeypatch.setattr(security, "_jwks_client", lambda url: FakeJwksClient(private.public_key()))
    return private


def test_es256_token_is_validated_with_jwks(es256):
    token = jwt.encode(claims(), es256, algorithm="ES256", headers={"kid": "k1"})
    user = security.decode_token(token, Settings(supabase_url=URL))
    assert user.email == "valeria@mail.com"


def test_es256_token_from_another_project_is_rejected(es256):
    token = jwt.encode(claims(iss="https://other.supabase.co/auth/v1"), es256, algorithm="ES256")
    with pytest.raises(HTTPException) as exc:
        security.decode_token(token, Settings(supabase_url=URL))
    assert exc.value.status_code == 401


def test_es256_expired_token_is_rejected(es256):
    token = jwt.encode(claims(exp=int(time.time()) - 5), es256, algorithm="ES256")
    with pytest.raises(HTTPException):
        security.decode_token(token, Settings(supabase_url=URL))


def test_es256_anon_audience_is_rejected(es256):
    token = jwt.encode(claims(aud="anon"), es256, algorithm="ES256")
    with pytest.raises(HTTPException):
        security.decode_token(token, Settings(supabase_url=URL))
