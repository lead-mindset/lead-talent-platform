"""Lectura del CV con IA (POST /talent/resume/parse), con el cliente de Azure simulado."""

import io
import json
import logging
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

import httpx
import jwt
import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter

from app.core.config import Settings, get_settings
from app.core.db import get_conn
from app.core.logging import JsonFormatter, RedactFilter
from app.core.storage import get_storage
from app.main import app
from app.modules.talent.cv_ai import CV_SCHEMA, AzureCvModel, CvModelError, ModelResult
from app.modules.talent.resume_parse import ResumeParseService
from app.modules.talent.resume_text import DOC, DOCX, PDF
from app.modules.talent.router import get_parse_service
from tests.fakes import (
    AUTH_ID,
    PERSON_ID,
    UNIVERSITY_ID,
    FakeCore,
    FakeStorage,
    FakeTalent,
    make_person,
)

SECRET = "test-secret-at-least-32-characters-long"
URL = "/api/v1/talent/resume/parse"
CVS = Path(__file__).parent / "fixtures" / "cvs"
VALENTINA = (CVS / "01_Valentina_Rojas_CV.pdf").read_bytes()

GOOD = {
    "given_names": "Valentina",
    "family_names": "Rojas Fuentes",
    "email": "valentina.rojas@example.com",
    "phone": "+56 9 0000 0001",
    "linkedin": "linkedin.com/in/valentina-rojas-ejemplo",
    "city": "Chillán",
    "country": "CL",
    "university": "Universidad de Concepción",
    "program": "Ingeniería Comercial",
    "graduation_year": 2027,
    "career_stage": "estudiante_universitario",
    "skills": ["Excel avanzado", "Power BI", "SQL"],
    "languages": [{"name": "Español", "level": "Nativo"}, {"name": "Inglés", "level": "B2"}],
}


class FakeModel:
    """Sustituye a Azure. `error`: reason de CvModelError a lanzar."""

    def __init__(self, content=None, error=None, finish_reason="stop") -> None:
        self.content = json.dumps(GOOD) if content is None else content
        self.error = error
        self.finish_reason = finish_reason
        self.calls: list[str] = []

    def extract(self, cv_text: str) -> ModelResult:
        self.calls.append(cv_text)
        if self.error:
            raise CvModelError(self.error)
        return ModelResult(
            self.content, self.finish_reason, prompt_tokens=900, completion_tokens=200
        )


def auth():
    payload = {"sub": AUTH_ID, "aud": "authenticated", "exp": int(time.time()) + 3600}
    return {"Authorization": f"Bearer {jwt.encode(payload, SECRET, algorithm='HS256')}"}


def blank_pdf() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=595, height=842)  # como un PDF escaneado: sin texto
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


class Ctx:
    def __init__(self, model=None, settings=None, file=VALENTINA, mime=PDF, name="cv.pdf") -> None:
        self.settings = settings or Settings(supabase_jwt_secret=SECRET)
        self.core = FakeCore(make_person())
        self.talent = FakeTalent()
        self.storage = FakeStorage()
        self.model = FakeModel() if model is None else model
        if file is not None:
            path = f"{PERSON_ID}/cv"
            self.storage.files[path] = file
            self.talent.replace_current_resume(
                PERSON_ID,
                {
                    "storage_path": path,
                    "file_name": name,
                    "mime_type": mime,
                    "size_bytes": len(file),
                },
            )

    def service(self) -> ResumeParseService:
        return ResumeParseService(
            self.core, self.talent, self.storage, self.model or None, self.settings
        )

    def parse(self, **body):
        from app.modules.talent.schemas import ResumeParseIn

        return self.service().parse(AUTH_ID, ResumeParseIn(**body))


def session():
    return {"session_id": str(uuid4()), "device": "mobile"}


# ------------------------------------------------------------------ éxito
def test_parse_ok_returns_suggestions_and_saves_nothing():
    ctx = Ctx()
    out = ctx.parse(**session())

    assert out["status"] == "ok" and out["reason"] is None
    s = out["suggestions"]
    assert (s.given_names, s.family_names, s.email) == ("Valentina", "Rojas Fuentes", GOOD["email"])
    assert s.country_code == "CL"
    assert (s.city_id, s.city_name, s.city_other) == (3895088, "Chillán", None)
    assert str(s.university_id) == UNIVERSITY_ID
    assert s.major == "Ingeniería Comercial" and s.graduation_year == 2027
    assert s.career_stage == "estudiante_universitario"
    assert [lang.name for lang in s.languages] == ["Español", "Inglés"]
    # Solo sugiere: el perfil y la persona no cambian, y no hay evento de falla.
    assert ctx.talent.profiles == {}
    assert ctx.core.persons[AUTH_ID]["given_names"] is None
    assert ctx.talent.events == []
    # Al modelo le llega el texto del CV, no los bytes.
    assert "valentina.rojas@example.com" in ctx.model.calls[0]


def test_no_catalog_match_keeps_text_as_suggestion():
    model = FakeModel(json.dumps({**GOOD, "city": "Pucón", "university": "Universidad Inventada"}))
    s = Ctx(model=model).parse()["suggestions"]
    assert (s.city_id, s.city_other) == (None, "Pucón")
    assert (s.university_id, s.university_name) == (None, "Universidad Inventada")


def test_unknown_country_is_dropped_and_city_not_matched():
    model = FakeModel(json.dumps({**GOOD, "country": "ZZ"}))
    s = Ctx(model=model).parse()["suggestions"]
    assert s.country_code is None
    assert (s.city_id, s.city_other) == (None, "Chillán")


def test_text_is_truncated_to_limit():
    ctx = Ctx(settings=Settings(supabase_jwt_secret=SECRET, cv_text_max_chars=300))
    ctx.parse()
    assert len(ctx.model.calls[0]) <= 300


def test_docx_is_read_including_tables():
    ctx = Ctx(
        file=(CVS / "04_Carlos_Gomez_HojaDeVida.docx").read_bytes(), mime=DOCX, name="cv.docx"
    )
    assert ctx.parse()["status"] == "ok"
    assert "Universidad de Antioquia" in ctx.model.calls[0]  # está dentro de una tabla


# ---------------------------------------------------- fallas sin llamar a la IA
@pytest.mark.parametrize(
    ("file", "mime", "name", "reason"),
    [
        (b"\xd0\xcf\x11\xe0 viejo word", DOC, "cv.doc", "formato_no_soportado"),
        (blank_pdf(), PDF, "cv.pdf", "sin_texto"),
        (b"", PDF, "cv.pdf", "archivo_danado"),
    ],
)
def test_unreadable_file_fails_without_calling_ai(file, mime, name, reason):
    ctx = Ctx(file=file, mime=mime, name=name)
    body = session()
    out = ctx.parse(**body)
    assert out == {"status": "failed", "reason": reason, "suggestions": None}
    assert ctx.model.calls == []
    assert ctx.talent.events == [
        {
            "session_id": body["session_id"],
            "name": "cv_lectura_fallida",
            "step": 2,
            "device": "mobile",
            "seconds_on_step": None,
            "reason": reason,
        }
    ]


def test_without_resume_fails_and_records_no_event():
    ctx = Ctx(file=None)
    assert ctx.parse(**session())["reason"] == "sin_cv"
    assert ctx.talent.events == [] and ctx.talent.parse_attempts == []


def test_ai_disabled_when_azure_vars_missing():
    settings = Settings(
        supabase_jwt_secret=SECRET,
        azure_tenant_id="",
        azure_client_id="",
        azure_client_secret="",
        foundry_endpoint="",
        foundry_deployment="",
    )
    from app.modules.talent.cv_ai import get_cv_model

    assert get_cv_model(settings) is None
    ctx = Ctx(model=False, settings=settings)
    assert ctx.parse(**session())["reason"] == "ia_desactivada"
    assert ctx.talent.events == []


def test_storage_failure():
    ctx = Ctx()
    ctx.storage.fail = True
    assert ctx.parse(**session())["reason"] == "cv_no_disponible"
    assert ctx.model.calls == []


# ------------------------------------------------------------ fallas de la IA
@pytest.mark.parametrize("reason", ["timeout", "ia_no_disponible"])
def test_ai_failure_records_funnel_event(reason):
    ctx = Ctx(model=FakeModel(error=reason))
    body = session()
    out = ctx.parse(**body)
    assert out == {"status": "failed", "reason": reason, "suggestions": None}
    assert ctx.talent.events[0]["name"] == "cv_lectura_fallida"
    assert ctx.talent.events[0]["reason"] == reason
    assert ctx.talent.events[0]["session_id"] == body["session_id"]


def test_failure_without_session_id_records_no_event():
    ctx = Ctx(model=FakeModel(error="timeout"))
    assert ctx.parse()["reason"] == "timeout"
    assert ctx.talent.events == []


@pytest.mark.parametrize(
    ("content", "finish_reason"),
    [
        ("no es json", "stop"),
        ("[1, 2]", "stop"),
        ("", "stop"),
        ('{"given_names": "Valen', "length"),  # se cortó por tokens
        (json.dumps({"nombre": "Valentina"}), "stop"),  # claves equivocadas: nada útil
        (json.dumps(dict.fromkeys(GOOD)), "stop"),  # todo null
    ],
)
def test_invalid_model_response(content, finish_reason):
    ctx = Ctx(model=FakeModel(content, finish_reason=finish_reason))
    out = ctx.parse(**session())
    assert out["status"] == "failed" and out["reason"] == "respuesta_invalida"
    assert ctx.talent.events[0]["reason"] == "respuesta_invalida"


def test_bad_fields_become_null_instead_of_failing():
    bad = {
        **GOOD,
        "email": "no-es-email",
        "country": "Chile",
        "graduation_year": 3020,
        "career_stage": "gerente",
        "linkedin": "github.com/x",
        "skills": [f"skill {i}" for i in range(30)],
        "languages": "Inglés",  # tipo equivocado: queda vacío, no se cae la lectura
    }
    s = Ctx(model=FakeModel(json.dumps(bad))).parse()["suggestions"]
    assert (s.email, s.country_code, s.graduation_year, s.career_stage, s.linkedin) == (
        None,
        None,
        None,
        None,
        None,
    )
    assert len(s.skills) == 15 and s.languages == []


# ---------------------------------------------------------------- límite
def test_hourly_limit_counts_every_attempt_including_failures():
    ctx = Ctx(model=FakeModel(error="timeout"))
    reasons = [ctx.parse(**session())["reason"] for _ in range(6)]
    assert reasons == ["timeout"] * 5 + ["limite_alcanzado"]
    assert len(ctx.model.calls) == 5  # la sexta no llega a Azure
    assert len(ctx.talent.parse_attempts) == 5
    assert ctx.talent.events[-1]["reason"] == "limite_alcanzado"


def test_attempt_is_recorded_before_calling_azure():
    ctx = Ctx()
    seen = []
    original = ctx.model.extract
    ctx.model.extract = lambda text: (seen.append(len(ctx.talent.parse_attempts)), original(text))[
        1
    ]
    ctx.parse()
    assert seen == [1]


def test_attempts_older_than_one_hour_do_not_count():
    ctx = Ctx()
    old = datetime.now(UTC) - timedelta(hours=1, minutes=1)
    ctx.talent.parse_attempts = [(PERSON_ID, old)] * 5
    assert ctx.parse()["status"] == "ok"


# ------------------------------------------------------------ privacidad
def test_logs_never_contain_cv_text_or_model_response(caplog):
    caplog.set_level(logging.DEBUG)
    ctx = Ctx(model=FakeModel(json.dumps({**GOOD, "city": "Pucón"})))
    ctx.parse(**session())
    Ctx(model=FakeModel(error="timeout")).parse(**session())

    text = "\n".join(
        f"{r.getMessage()} {json.dumps({k: str(v) for k, v in vars(r).items()})}"
        for r in caplog.records
    )
    for secret in [
        "valentina.rojas@example.com",
        "0000 0001",
        "Valentina",
        "Rojas",
        "Chillán",
        "Pucón",
        "Ingeniería Comercial",
        "Power BI",
        "linkedin.com/in",
    ]:
        assert secret not in text, secret

    line = next(r for r in caplog.records if r.getMessage() == "cv_parse" and r.result == "ok")
    assert line.file_type == "pdf" and line.chars > 0
    assert (line.prompt_tokens, line.completion_tokens) == (900, 200)
    assert line.city_match is False and line.university_match is True
    assert "phone" not in line.empty_fields and isinstance(line.duration_ms, int)


@pytest.mark.parametrize(
    ("env", "debug", "logged"),
    [
        ("local", True, True),
        ("production", True, False),
        ("preview", True, False),
        ("local", False, False),
    ],
)
def test_log_cv_debug_only_in_local(caplog, monkeypatch, env, debug, logged):
    import app.main

    caplog.set_level(logging.DEBUG)
    settings = Settings(supabase_jwt_secret=SECRET, env=env, log_cv_debug=debug)
    # El filtro del logger global también revisa el ambiente: usa los mismos settings.
    monkeypatch.setattr(app.main, "get_settings", lambda: settings)
    Ctx(settings=settings).parse()
    debug_records = [r for r in caplog.records if hasattr(r, "cv_text")]
    assert bool(debug_records) is logged
    if logged:
        assert "valentina.rojas@example.com" in debug_records[0].cv_text


def _emit(allow_debug: bool, msg: str, **extra) -> dict:
    stream = io.StringIO()
    logger = logging.getLogger(f"redact-test-{uuid4().hex}")
    logger.propagate = False
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter())
    logger.addFilter(RedactFilter(lambda: allow_debug))
    logger.addHandler(handler)
    logger.warning(msg, extra=extra)
    return json.loads(stream.getvalue())


def test_redact_filter_removes_sensitive_data():
    token = jwt.encode({"sub": "x"}, SECRET, algorithm="HS256")
    out = _emit(
        False,
        f"login ana.perez@mail.com tel +56 9 1234 5678 Authorization: Bearer {token} apikey=sb_secret_abc",
        email="ana@mail.com",
        phone="+51 999 888 777",
        cv_text="texto del CV",
        model_response='{"email": "x"}',
        headers={"Authorization": "Bearer abc", "apikey": "k"},
        detail={"nota": "escribir a juan@mail.com"},
        person_id=PERSON_ID,
        chars=1234,
    )
    raw = json.dumps(out)
    for leak in [
        "ana.perez@mail.com",
        "1234 5678",
        token,
        "sb_secret_abc",
        "ana@mail.com",
        "999 888",
        "texto del CV",
        "juan@mail.com",
        "Bearer abc",
    ]:
        assert leak not in raw, leak
    assert out["email"] == out["cv_text"] == out["model_response"] == out["headers"] == "[REDACTED]"
    # Lo que no es sensible sigue igual.
    assert out["person_id"] == PERSON_ID and out["chars"] == 1234


def test_redact_filter_keeps_cv_text_only_when_debug_allowed():
    assert _emit(True, "cv_debug", cv_text="hola", cv_debug=True)["cv_text"] == "hola"
    assert _emit(False, "cv_debug", cv_text="hola", cv_debug=True)["cv_text"] == "[REDACTED]"
    # Sin la marca cv_debug tampoco pasa, aunque el ambiente lo permita.
    assert _emit(True, "x", cv_text="hola")["cv_text"] == "[REDACTED]"


def test_redact_filter_cleans_stack_traces():
    stream = io.StringIO()
    logger = logging.getLogger(f"redact-test-{uuid4().hex}")
    logger.propagate = False
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter())
    logger.addFilter(RedactFilter())
    logger.addHandler(handler)
    try:
        raise ValueError("falló para ana@mail.com")
    except ValueError:
        logger.exception("error")
    out = json.loads(stream.getvalue())
    assert out["error_type"] == "ValueError"
    assert "Traceback" in out["stack"] and "ana@mail.com" not in out["stack"]


# --------------------------------------------------------------- endpoint
@pytest.fixture
def api():
    ctx = Ctx()
    app.dependency_overrides[get_settings] = lambda: ctx.settings
    app.dependency_overrides[get_conn] = lambda: None
    app.dependency_overrides[get_storage] = lambda: ctx.storage
    app.dependency_overrides[get_parse_service] = ctx.service
    yield TestClient(app), ctx
    app.dependency_overrides.clear()


def test_endpoint_requires_auth(api):
    client, ctx = api
    assert client.post(URL, json={}).status_code == 401
    assert ctx.model.calls == []


def test_endpoint_returns_suggestions_and_request_id(api):
    client, _ = api
    r = client.post(URL, json=session(), headers=auth())
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok" and body["suggestions"]["city_id"] == 3895088
    assert len(r.headers["X-Request-ID"]) == 32


def test_endpoint_failure_is_200_with_reason(api):
    client, ctx = api
    ctx.model.error = "timeout"
    r = client.post(URL, json=session(), headers=auth())
    assert r.status_code == 200
    assert r.json() == {"status": "failed", "reason": "timeout", "suggestions": None}


def test_endpoint_rejects_unknown_fields(api):
    client, _ = api
    assert client.post(URL, json={"cv_text": "x"}, headers=auth()).status_code == 422


def test_request_log_has_person_id_and_no_pii(api):
    client, _ = api
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter())
    handler.addFilter(RedactFilter())
    logger = logging.getLogger("lead_talent")
    logger.addHandler(handler)
    try:
        r = client.post(URL, json=session(), headers=auth())
    finally:
        logger.removeHandler(handler)
    lines = [json.loads(line) for line in stream.getvalue().splitlines()]
    request = next(line for line in lines if line["msg"] == "request")
    parse = next(line for line in lines if line["msg"] == "cv_parse")
    assert request["endpoint"] == "POST /api/v1/talent/resume/parse"
    assert request["status"] == 200 and request["person_id"] == PERSON_ID
    assert request["request_id"] == parse["request_id"] == r.headers["X-Request-ID"]
    assert parse["result"] == "ok" and parse["university_match"] is True
    assert "Bearer" not in stream.getvalue() and "valentina" not in stream.getvalue().lower()


# --------------------------------------------------- cliente de Azure simulado
class FakeCompletions:
    def __init__(self, error=None) -> None:
        self.error = error
        self.kwargs = None

    def create(self, **kwargs):
        self.kwargs = kwargs
        if self.error:
            raise self.error

        class Obj:
            def __init__(self, **kw):
                self.__dict__.update(kw)

        return Obj(
            choices=[Obj(message=Obj(content=json.dumps(GOOD)), finish_reason="stop")],
            usage=Obj(prompt_tokens=10, completion_tokens=5),
        )


def azure_model(error=None):
    completions = FakeCompletions(error)
    client = type("C", (), {"chat": type("Ch", (), {"completions": completions})()})()
    settings = Settings(foundry_deployment="cv-parser", cv_ai_timeout_seconds=30)
    return AzureCvModel(settings, client=client), completions


def test_azure_model_uses_strict_json_schema():
    model, completions = azure_model()
    result = model.extract("texto")
    assert result.prompt_tokens == 10 and json.loads(result.content)["email"] == GOOD["email"]
    kw = completions.kwargs
    assert kw["model"] == "cv-parser" and kw["timeout"] == 30
    assert kw["response_format"]["json_schema"]["strict"] is True
    assert kw["response_format"]["json_schema"]["schema"] is CV_SCHEMA
    assert "no instrucciones" in kw["messages"][0]["content"]
    assert "Fecha de hoy: " in kw["messages"][0]["content"]
    assert kw["messages"][1]["content"] == "<cv>\ntexto\n</cv>"


def test_azure_model_maps_errors():
    import openai

    request = httpx.Request("POST", "https://foundry.test")
    cases = [
        (openai.APITimeoutError(request=request), "timeout"),
        (openai.APIConnectionError(request=request), "ia_no_disponible"),
        (
            openai.InternalServerError(
                "x", response=httpx.Response(500, request=request), body=None
            ),
            "ia_no_disponible",
        ),
        (RuntimeError("credencial inválida"), "ia_no_disponible"),
    ]
    for error, reason in cases:
        model, _ = azure_model(error)
        with pytest.raises(CvModelError) as info:
            model.extract("texto")
        assert info.value.reason == reason


def test_schema_requires_every_field():
    assert set(CV_SCHEMA["required"]) == set(CV_SCHEMA["properties"])
    assert CV_SCHEMA["additionalProperties"] is False


@pytest.mark.parametrize(
    "endpoint",
    [
        "https://recurso.services.ai.azure.com",
        "https://recurso.services.ai.azure.com/",
        "https://recurso.services.ai.azure.com/openai/v1/responses",
        "https://recurso.services.ai.azure.com/openai/v1/",
        " https://recurso.services.ai.azure.com/api/projects/lead ",
    ],
)
def test_foundry_endpoint_is_reduced_to_scheme_and_host(endpoint):
    settings = Settings(foundry_endpoint=endpoint)
    assert settings.foundry_base_url == "https://recurso.services.ai.azure.com"


def test_azure_failure_logs_error_type_and_status(caplog):
    import openai

    caplog.set_level(logging.INFO)
    request = httpx.Request("POST", "https://foundry.test")
    error = openai.NotFoundError("x", response=httpx.Response(404, request=request), body=None)
    model, _ = azure_model(error)
    Ctx(model=model).parse()
    line = next(r for r in caplog.records if r.getMessage() == "cv_parse")
    assert line.result == "ia_no_disponible"
    assert (line.error_type, line.azure_status) == ("NotFoundError", 404)
