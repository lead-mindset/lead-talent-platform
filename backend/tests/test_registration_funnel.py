"""Registro de 6 pasos: career_stage en el perfil y eventos del embudo."""

import time
from uuid import uuid4

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
URL = "/api/v1/talent/events"

STAGES = ["estudiante_universitario", "recien_graduado", "posgrado", "profesional_joven"]
EVENTS = [
    "registro_paso_visto",
    "registro_paso_completado",
    "cv_subido",
    "registro_sin_cv",
    "cv_lectura_fallida",
    "registro_terminado",
]


def auth():
    payload = {"sub": AUTH_ID, "aud": "authenticated", "exp": int(time.time()) + 3600}
    return {"Authorization": f"Bearer {jwt.encode(payload, SECRET, algorithm='HS256')}"}


@pytest.fixture
def ctx():
    settings = Settings(supabase_jwt_secret=SECRET)
    talent = FakeTalent()
    core, storage = FakeCore(make_person()), FakeStorage()
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_conn] = lambda: None
    app.dependency_overrides[get_storage] = lambda: storage
    app.dependency_overrides[get_service] = lambda: TalentService(core, talent, storage, settings)
    yield TestClient(app), talent
    app.dependency_overrides.clear()


def event(**overrides):
    base = {
        "session_id": str(uuid4()),
        "name": "registro_paso_visto",
        "step": 1,
        "device": "mobile",
    }
    return {**base, **overrides}


# ------------------------------------------------------------ career_stage
def profile_body(**overrides):
    base = {"given_names": "Valeria", "country_code": "PE", "university_id": UNIVERSITY_ID}
    return {**base, **overrides}


@pytest.mark.parametrize("stage", STAGES)
def test_profile_saves_career_stage(ctx, stage):
    client, _ = ctx
    r = client.put("/api/v1/talent/profile", headers=auth(), json=profile_body(career_stage=stage))
    assert r.status_code == 200
    assert r.json()["profile"]["career_stage"] == stage


def test_profile_career_stage_is_optional(ctx):
    client, _ = ctx
    r = client.put("/api/v1/talent/profile", headers=auth(), json=profile_body())
    assert r.status_code == 200
    assert r.json()["profile"]["career_stage"] is None


def test_profile_rejects_unknown_career_stage(ctx):
    client, _ = ctx
    r = client.put("/api/v1/talent/profile", headers=auth(), json=profile_body(career_stage="jefe"))
    assert r.status_code == 422


# ------------------------------------------------------------------ eventos
@pytest.mark.parametrize("name", EVENTS)
def test_accepts_every_funnel_event(ctx, name):
    client, talent = ctx
    r = client.post(URL, headers=auth(), json=event(name=name, step=2))
    assert r.status_code == 204
    assert talent.events[-1]["name"] == name


def test_stores_only_the_event_fields(ctx):
    client, talent = ctx
    body = event(name="registro_paso_completado", step=3, device="desktop", seconds_on_step=42)
    assert client.post(URL, headers=auth(), json=body).status_code == 204

    assert talent.events == [
        {
            "session_id": body["session_id"],
            "name": "registro_paso_completado",
            "step": 3,
            "device": "desktop",
            "seconds_on_step": 42,
            "reason": None,
        }
    ]


def test_failure_event_keeps_its_reason(ctx):
    client, talent = ctx
    body = event(name="cv_lectura_fallida", step=2, reason="timeout")
    assert client.post(URL, headers=auth(), json=body).status_code == 204
    assert talent.events[-1]["reason"] == "timeout"


def test_requires_login(ctx):
    client, talent = ctx
    assert client.post(URL, json=event()).status_code == 401
    assert talent.events == []


@pytest.mark.parametrize(
    "bad",
    [
        {"name": "registro_abandonado"},  # nombre fuera de la lista
        {"name": "REGISTRO_PASO_VISTO"},
        {"step": 0},
        {"step": 7},
        {"device": "smart-tv"},
        {"seconds_on_step": -1},
        {"seconds_on_step": 86401},
        {"session_id": "no-es-uuid"},
        {"reason": "timeout"},  # reason solo con cv_lectura_fallida
        {"name": "cv_lectura_fallida", "reason": "Valeria Mendoza no tiene CV"},  # texto libre
        {"email": "valeria@mail.com"},  # campos extra = posibles datos personales
        {"given_names": "Valeria"},
    ],
)
def test_rejects_invalid_events(ctx, bad):
    client, talent = ctx
    r = client.post(URL, headers=auth(), json=event(**bad))
    assert r.status_code == 422
    assert talent.events == []


@pytest.mark.parametrize("missing", ["session_id", "name", "step", "device"])
def test_rejects_missing_required_fields(ctx, missing):
    client, _ = ctx
    body = event()
    del body[missing]
    assert client.post(URL, headers=auth(), json=body).status_code == 422
