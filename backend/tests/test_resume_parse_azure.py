"""Integración real con Azure OpenAI (deployment cv-parser) sobre los 5 CVs de ejemplo.

No corre por defecto. Para correrlo: uv run pytest -m azure
Usa las variables de backend/.env y la base local (catálogo de ciudades y universidades).
Se salta si faltan las variables de Azure.
"""

import json
import unicodedata
from pathlib import Path

import psycopg
import pytest
from psycopg.rows import dict_row

from app.core.config import Settings
from app.modules.core.repository import CoreRepository
from app.modules.talent.cv_ai import AzureCvModel
from app.modules.talent.resume_parse import ResumeParseService
from app.modules.talent.resume_text import DOCX, PDF
from app.modules.talent.schemas import ResumeParseIn
from tests.fakes import AUTH_ID, PERSON_ID, FakeStorage, FakeTalent, make_person

pytestmark = pytest.mark.azure

CVS = Path(__file__).parent / "fixtures" / "cvs"
EXPECTED = json.loads((CVS / "expected.json").read_text(encoding="utf-8"))
FILES = sorted(p.name for p in CVS.iterdir() if p.suffix in {".pdf", ".docx"})
MIN_SKILLS_IN_COMMON = 3

settings = Settings()
if not settings.cv_ai_enabled:
    pytest.skip("Faltan las variables de Azure en backend/.env", allow_module_level=True)


def plain(value: str | None) -> str:
    text = unicodedata.normalize("NFD", (value or "").lower())
    return " ".join("".join(c for c in text if unicodedata.category(c) != "Mn").split())


class CatalogCore(CoreRepository):
    """Catálogo real (base local) con una persona de prueba en memoria."""

    def get_person_by_auth_user(self, auth_user_id):
        return make_person()


@pytest.fixture(scope="module")
def conn():
    try:
        with psycopg.connect(settings.database_url, row_factory=dict_row, connect_timeout=3) as c:
            yield c
    except psycopg.OperationalError:
        pytest.skip("No hay base de datos para cruzar con el catálogo")


@pytest.fixture(scope="module")
def model():
    return AzureCvModel(settings)


@pytest.mark.parametrize("name", FILES)
def test_cv_matches_expected(name, conn, model):
    path = CVS / name
    storage, talent = FakeStorage(), FakeTalent()
    storage.files["cv"] = path.read_bytes()
    talent.replace_current_resume(
        PERSON_ID,
        {
            "storage_path": "cv",
            "file_name": name,
            "mime_type": PDF if path.suffix == ".pdf" else DOCX,
            "size_bytes": path.stat().st_size,
        },
    )
    core = CatalogCore(conn)
    service = ResumeParseService(core, talent, storage, model, settings)
    out = service.parse(AUTH_ID, ResumeParseIn())
    assert out["status"] == "ok", out["reason"]
    got, exp = out["suggestions"], EXPECTED[name]

    # Exactos.
    assert got.email == exp["email"]
    assert got.country_code == exp["country"]
    assert got.career_stage == exp["career_stage"]
    assert plain(got.family_names) == plain(exp["family_names"])

    # Ciudad y universidad: por catálogo. Si hay coincidencia, debe ser la esperada.
    expected_cities = core.search_cities(exp["country"], exp["city"], 5) if exp["city"] else []
    expected_city = next((c for c in expected_cities if c.get("exact")), None)
    if expected_city:
        assert got.city_id == expected_city["id"], (got.city_id, got.city_other)
    else:
        assert plain(got.city_other) == plain(exp["city"])

    expected_unis = [
        u
        for u in core.search_universities(exp["university"], 20)
        if plain(u["name"]) == plain(exp["university"])
    ]
    if len(expected_unis) == 1:
        assert str(got.university_id) == str(expected_unis[0]["id"])
    else:
        assert plain(exp["university"]) in plain(got.university_name) or plain(
            got.university_name
        ) in plain(exp["university"])

    # Skills: intersección mínima.
    common = {plain(s) for s in got.skills} & {plain(s) for s in exp["skills"]}
    assert len(common) >= min(MIN_SKILLS_IN_COMMON, len(exp["skills"])), common
