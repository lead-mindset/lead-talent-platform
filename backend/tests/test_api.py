"""Pruebas HTTP: autenticación con JWT y cableado de rutas."""

import time

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.core.db import get_conn
from app.core.storage import get_storage
from app.main import app
from app.modules.talent.router import get_service
from app.modules.talent.service import TalentService
from tests.fakes import AUTH_ID, UNIVERSITY_ID, FakeCore, FakeStorage, FakeTalent, make_person

SECRET = "test-secret-at-least-32-characters-long"


def token(sub=AUTH_ID, secret=SECRET, exp_in=3600, aud="authenticated"):
    payload = {"sub": sub, "email": "valeria@mail.com", "aud": aud, "exp": int(time.time()) + exp_in}
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.fixture
def client():
    settings = Settings(supabase_jwt_secret=SECRET)
    core, talent, storage = FakeCore(make_person()), FakeTalent(), FakeStorage()
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_conn] = lambda: None
    app.dependency_overrides[get_storage] = lambda: storage
    app.dependency_overrides[get_service] = lambda: TalentService(core, talent, storage, settings)
    yield TestClient(app)
    app.dependency_overrides.clear()


def auth(t=None):
    return {"Authorization": f"Bearer {t or token()}"}


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


@pytest.mark.parametrize(
    "bad",
    [None, token(secret="another-secret-also-32-characters-long"), token(exp_in=-10), token(aud="anon")],
)
def test_rejects_missing_or_bad_tokens(client, bad):
    headers = auth(bad) if bad else {}
    assert client.get("/api/v1/talent/profile", headers=headers).status_code == 401


def test_full_registration_flow(client):
    r = client.get("/api/v1/talent/profile", headers=auth())
    assert r.status_code == 200 and r.json()["profile"] is None

    body = {"given_names": "Valeria", "family_names": "Mendoza", "university_id": UNIVERSITY_ID, "skills": ["Python"]}
    r = client.put("/api/v1/talent/profile", headers=auth(), json=body)
    assert r.status_code == 200
    assert r.json()["profile"]["recruiter_visible"] is False

    r = client.get("/api/v1/talent/resume", headers=auth())
    assert r.status_code == 204

    r = client.post(
        "/api/v1/talent/resume/upload-url",
        headers=auth(),
        json={"file_name": "cv.pdf", "mime_type": "application/pdf", "size_bytes": 2048},
    )
    assert r.status_code == 200
    path = r.json()["storage_path"]

    r = client.post(
        "/api/v1/talent/resume",
        headers=auth(),
        json={"storage_path": path, "file_name": "cv.pdf", "mime_type": "application/pdf", "size_bytes": 2048},
    )
    assert r.status_code == 201

    r = client.get("/api/v1/talent/resume", headers=auth())
    assert r.status_code == 200 and r.json()["download_url"]


def test_service_errors_map_to_http_codes(client):
    r = client.post(
        "/api/v1/talent/resume/upload-url",
        headers=auth(),
        json={"file_name": "cv.pdf", "mime_type": "application/pdf", "size_bytes": 50 * 1024 * 1024},
    )
    assert r.status_code == 413
    assert r.json()["detail"]["code"] == "file_too_large"
