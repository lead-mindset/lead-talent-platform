"""Rutas de core (/me, /universities) y manejo de errores 500 con CORS."""

import time
from typing import ClassVar

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.core.db import get_conn
from app.main import app
from app.modules.core import router as core_router
from app.modules.talent.router import get_service
from tests.fakes import AUTH_ID, PERSON_ID, UNIVERSITY_ID, make_person

SECRET = "test-secret-at-least-32-characters-long"


def auth():
    token = jwt.encode(
        {"sub": AUTH_ID, "aud": "authenticated", "exp": int(time.time()) + 3600}, SECRET, algorithm="HS256"
    )
    return {"Authorization": f"Bearer {token}"}


class FakeCoreRepo:
    person = make_person(given_names="Valeria", full_name="Valeria")
    roles: ClassVar[dict[str, list[str]]] = {"talent": ["student"]}

    def __init__(self, conn):
        pass

    def get_person_by_auth_user(self, auth_user_id):
        return self.person

    def get_roles(self, person_id):
        return self.roles

    def search_universities(self, q):
        return [{"id": UNIVERSITY_ID, "name": "UTEC", "country_code": "PE"}] if "ute" in q.lower() else []


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(core_router, "CoreRepository", FakeCoreRepo)
    app.dependency_overrides[get_settings] = lambda: Settings(supabase_jwt_secret=SECRET)
    app.dependency_overrides[get_conn] = lambda: None
    yield TestClient(app)
    app.dependency_overrides.clear()
    FakeCoreRepo.person = make_person(given_names="Valeria", full_name="Valeria")


def test_me_returns_person_and_roles(client):
    r = client.get("/api/v1/me", headers=auth())
    assert r.status_code == 200
    body = r.json()
    assert body["person"]["id"] == PERSON_ID
    assert body["roles"] == {"talent": ["student"]}


def test_me_without_confirmed_email_is_409(client):
    FakeCoreRepo.person = None
    r = client.get("/api/v1/me", headers=auth())
    assert r.status_code == 409


def test_me_requires_token(client):
    assert client.get("/api/v1/me").status_code == 401


def test_universities_search(client):
    r = client.get("/api/v1/universities", params={"q": "ute"}, headers=auth())
    assert r.status_code == 200
    assert r.json()[0]["name"] == "UTEC"


def test_universities_query_too_short(client):
    r = client.get("/api/v1/universities", params={"q": "u"}, headers=auth())
    assert r.status_code == 422


def test_unexpected_error_returns_json_500_with_cors(client):
    def boom():
        raise RuntimeError("database is down")

    app.dependency_overrides[get_service] = boom
    r = client.get(
        "/api/v1/talent/profile", headers={**auth(), "Origin": "http://localhost:3000"}
    )
    assert r.status_code == 500
    assert r.json()["detail"]["code"] == "server_error"
    assert "database is down" not in r.text  # no filtrar detalles internos
    assert r.headers.get("access-control-allow-origin") == "http://localhost:3000"
