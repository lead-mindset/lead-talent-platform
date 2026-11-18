"""Catálogo de países y ciudades: servicio, rutas y reglas de ciudad en el perfil."""

import pytest
from pydantic import ValidationError

from app.modules.core.repository import escape_like
from app.modules.core.service import CatalogService, CoreError
from app.modules.talent.schemas import ProfileIn
from app.modules.talent.service import TalentError
from tests.fakes import AUTH_ID, UNIVERSITY_ID
from tests.test_core_api import FakeCoreRepo, auth, client  # noqa: F401  (fixture)
from tests.test_talent_service import build, profile_in

CHILLAN, LIMA, DALLAS = 3895088, 3936456, 4684888


class FakeCatalogRepo:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str, int]] = []

    def list_countries(self):
        return [{"code": "CL", "name_es": "Chile", "name_en": "Chile"}]

    def country_exists(self, code: str) -> bool:
        return code in {"CL", "PE"}

    def search_cities(self, country_code: str, query: str, limit: int):
        self.calls.append((country_code, query, limit))
        return [{"id": CHILLAN, "name": "Chillán", "admin1": "Ñuble", "country_code": "CL"}]


# ------------------------------------------------------------ CatalogService
def test_search_normalizes_country_and_spaces():
    repo = FakeCatalogRepo()
    CatalogService(repo).search_cities("cl", "  puerto   montt ")
    assert repo.calls == [("CL", "puerto montt", 10)]


def test_search_requires_two_letters_after_trimming():
    with pytest.raises(CoreError) as exc:
        CatalogService(FakeCatalogRepo()).search_cities("CL", "  a  ")
    assert exc.value.code == "query_too_short"


def test_search_rejects_unknown_country():
    with pytest.raises(CoreError) as exc:
        CatalogService(FakeCatalogRepo()).search_cities("XX", "lima")
    assert exc.value.code == "country_not_found"


@pytest.mark.parametrize(("asked", "used"), [(0, 1), (5, 5), (500, 20)])
def test_search_limit_is_clamped(asked, used):
    repo = FakeCatalogRepo()
    CatalogService(repo).search_cities("CL", "chillan", asked)
    assert repo.calls[0][2] == used


def test_escape_like_makes_wildcards_literal():
    assert escape_like("50%_a\\b") == "50\\%\\_a\\\\b"


# -------------------------------------------------------------------- rutas
class CatalogRouteRepo(FakeCoreRepo):
    def list_countries(self):
        return FakeCatalogRepo().list_countries()

    def country_exists(self, code):
        return FakeCatalogRepo().country_exists(code)

    def search_cities(self, country_code, query, limit):
        return FakeCatalogRepo().search_cities(country_code, query, limit)


@pytest.fixture
def catalog_client(client, monkeypatch):  # noqa: F811
    from app.modules.core import router as core_router

    monkeypatch.setattr(core_router, "CoreRepository", CatalogRouteRepo)
    return client


def test_countries_route(catalog_client):
    r = catalog_client.get("/api/v1/countries", headers=auth())
    assert r.status_code == 200
    assert r.json() == [{"code": "CL", "name_es": "Chile", "name_en": "Chile"}]


def test_cities_route(catalog_client):
    r = catalog_client.get(
        "/api/v1/cities", params={"country": "CL", "q": "chillan"}, headers=auth()
    )
    assert r.status_code == 200
    assert r.json() == [{"id": CHILLAN, "name": "Chillán", "admin1": "Ñuble", "country_code": "CL"}]


@pytest.mark.parametrize(
    ("params", "code"),
    [
        ({"country": "CL", "q": "c"}, None),  # muy corto: lo corta FastAPI
        ({"country": "CHL", "q": "chillan"}, None),  # no es ISO de 2 letras
        ({"country": "XX", "q": "chillan"}, "country_not_found"),
        ({"country": "CL", "q": "chillan", "limit": 50}, None),
    ],
)
def test_cities_route_rejects_bad_input(catalog_client, params, code):
    r = catalog_client.get("/api/v1/cities", params=params, headers=auth())
    assert r.status_code == 422
    if code:
        assert r.json()["detail"]["code"] == code


def test_catalog_routes_require_token(catalog_client):
    assert catalog_client.get("/api/v1/countries").status_code == 401
    assert (
        catalog_client.get("/api/v1/cities", params={"country": "CL", "q": "ab"}).status_code == 401
    )


# --------------------------------------------------- ciudad en el perfil
def test_profile_requires_country():
    with pytest.raises(ValidationError):
        ProfileIn(given_names="Valeria", university_id=UNIVERSITY_ID)


def test_profile_rejects_city_id_and_city_other_together():
    with pytest.raises(ValidationError, match="no las dos"):
        profile_in(country_code="CL", city_id=CHILLAN, city_other="Chillán")


def test_city_is_optional():
    service, *_ = build()
    person = service.save_profile(AUTH_ID, profile_in(country_code="CL"))["person"]
    assert person["city_id"] is None
    assert person["city_other"] is None


def test_catalog_city_of_the_country_is_saved():
    service, *_ = build()
    person = service.save_profile(AUTH_ID, profile_in(country_code="CL", city_id=CHILLAN))["person"]
    assert person["city_id"] == CHILLAN
    assert person["city_other"] is None


def test_city_from_another_country_is_rejected():
    service, *_ = build()
    with pytest.raises(TalentError) as exc:
        service.save_profile(AUTH_ID, profile_in(country_code="CL", city_id=DALLAS))
    assert exc.value.code == "city_not_in_country"


def test_unknown_country_is_rejected():
    service, *_ = build()
    with pytest.raises(TalentError) as exc:
        service.save_profile(AUTH_ID, profile_in(country_code="XX"))
    assert exc.value.code == "country_not_found"


def test_city_not_found_saves_free_text_trimmed():
    service, *_ = build()
    person = service.save_profile(AUTH_ID, profile_in(city_other="  Pueblito  "))["person"]
    assert person["city_other"] == "Pueblito"
    assert person["city_id"] is None


def test_blank_city_other_becomes_null():
    service, *_ = build()
    person = service.save_profile(AUTH_ID, profile_in(city_other="   "))["person"]
    assert person["city_other"] is None


def test_put_profile_maps_city_errors_to_422(client):  # noqa: F811
    from app.main import app
    from app.modules.talent.router import get_service

    service, *_ = build()
    app.dependency_overrides[get_service] = lambda: service
    body = {
        "given_names": "Valeria",
        "country_code": "CL",
        "city_id": DALLAS,
        "university_id": UNIVERSITY_ID,
        "skills": ["Python"],
    }
    r = client.put("/api/v1/talent/profile", json=body, headers=auth())
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "city_not_in_country"
