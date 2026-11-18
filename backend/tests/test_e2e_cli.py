"""El CLI de acciones rápidas: guardas de seguridad y llamadas a Supabase (simuladas)."""

import json

import httpx
import pytest

from app.core.config import Settings
from scripts import e2e

SETTINGS = Settings(supabase_url="https://test-ref.supabase.co", supabase_secret_key="sb_secret_test")


def supabase_with(handler):
    return e2e.Supabase(SETTINGS, client=httpx.Client(transport=httpx.MockTransport(handler)))


@pytest.mark.parametrize(
    ("email", "ok"),
    [("ana+e2e@leadmindset.org", True), ("ANA+E2E@leadmindset.org", True), ("ana@leadmindset.org", False)],
)
def test_only_test_emails_are_allowed(email, ok):
    if ok:
        e2e.require_test_email(email)
    else:
        with pytest.raises(e2e.E2EError):
            e2e.require_test_email(email)


def test_missing_config_is_explained():
    with pytest.raises(e2e.E2EError, match="SUPABASE_URL"):
        e2e.Supabase(Settings(supabase_url="https://<project-ref>.supabase.co", supabase_secret_key="x"))


def test_ensure_user_ignores_existing_user():
    def handler(request):
        return httpx.Response(422, json={"code": "email_exists", "msg": "A user with this email address has already been registered"})

    supabase_with(handler).ensure_user("ana+e2e@leadmindset.org")


def test_session_uses_generated_link_without_sending_email():
    calls = []

    def handler(request):
        calls.append((request.method, request.url.path, json.loads(request.content or b"{}")))
        if request.url.path.endswith("/admin/generate_link"):
            return httpx.Response(
                200,
                json={"id": "u1", "email_otp": "123456", "hashed_token": "hash", "verification_type": "magiclink"},
            )
        if request.url.path.endswith("/verify"):
            return httpx.Response(200, json={"access_token": "tok", "refresh_token": "r"})
        return httpx.Response(404)

    data = supabase_with(handler).session("ana+e2e@leadmindset.org")
    assert data["access_token"] == "tok"
    assert calls[0][1] == "/auth/v1/admin/generate_link"
    assert calls[1][2] == {"type": "magiclink", "token_hash": "hash"}
    assert not any(path.endswith("/otp") for _, path, _ in calls)  # nunca manda correo


def test_generate_otp_reads_nested_properties():
    def handler(request):
        return httpx.Response(200, json={"properties": {"email_otp": "654321", "hashed_token": "h"}})

    assert supabase_with(handler).generate_otp("x+e2e@mail.com")["otp"] == "654321"


def test_api_error_includes_status():
    api = e2e.Api("http://api.test", "tok", client=httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(401, text="nope"))))
    with pytest.raises(e2e.E2EError, match="HTTP 401"):
        api.call("GET", "/me")


def test_api_unreachable_is_explained():
    def handler(request):
        raise httpx.ConnectError("refused")

    api = e2e.Api("http://api.test", "tok", client=httpx.Client(transport=httpx.MockTransport(handler)))
    with pytest.raises(e2e.E2EError, match="uvicorn"):
        api.call("GET", "/me")


def test_reset_refuses_real_email(capsys):
    assert e2e.main(["reset", "angela@leadmindset.org"]) == 1
    assert "+e2e@" in capsys.readouterr().err
