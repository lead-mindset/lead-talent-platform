"""La documentación de la API (/docs, /redoc, /openapi.json) solo existe con ENV=local."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import Settings

PATHS = ["/docs", "/redoc", "/openapi.json"]


def client_for(env: str) -> TestClient:
    return TestClient(FastAPI(**Settings(env=env).api_docs_urls))


@pytest.mark.parametrize("env", ["local", "LOCAL", " local "])
def test_docs_on_in_local(env):
    client = client_for(env)
    for path in PATHS:
        assert client.get(path).status_code == 200, path


@pytest.mark.parametrize("env", ["production", "qa", "preview", ""])
def test_docs_off_outside_local(env):
    client = client_for(env)
    for path in PATHS:
        assert client.get(path).status_code == 404, path


def test_docs_off_by_default():
    # Sin ENV, el backend se trata como desplegado.
    assert Settings.model_fields["env"].default != "local"
    assert Settings(env="production").api_docs_urls["docs_url"] is None
