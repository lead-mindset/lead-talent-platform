from fastapi import APIRouter, HTTPException, Query, status

from app.core.db import Conn
from app.core.security import CurrentUser
from app.modules.core.repository import CoreRepository
from app.modules.core.schemas import CityOut, CountryOut, MeOut, PersonOut, UniversityOut
from app.modules.core.service import CatalogService, CoreError

router = APIRouter(tags=["core"])


@router.get("/me", response_model=MeOut)
def get_me(user: CurrentUser, conn: Conn) -> MeOut:
    repo = CoreRepository(conn)
    person = repo.get_person_by_auth_user(user.id)
    if person is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Confirma tu email para continuar")
    return MeOut(person=PersonOut(**person), roles=repo.get_roles(str(person["id"])))


@router.get("/universities", response_model=list[UniversityOut])
def search_universities(
    user: CurrentUser, conn: Conn, q: str = Query(min_length=2, max_length=80)
) -> list[UniversityOut]:
    return [UniversityOut(**row) for row in CoreRepository(conn).search_universities(q)]


def _http(err: CoreError) -> HTTPException:
    return HTTPException(422, {"code": err.code, "message": err.message})


@router.get("/countries", response_model=list[CountryOut])
def list_countries(user: CurrentUser, conn: Conn) -> list[CountryOut]:
    return [CountryOut(**row) for row in CatalogService(CoreRepository(conn)).list_countries()]


@router.get("/cities", response_model=list[CityOut])
def search_cities(
    user: CurrentUser,
    conn: Conn,
    country: str = Query(pattern=r"^[A-Za-z]{2}$"),
    q: str = Query(min_length=2, max_length=80),
    limit: int = Query(default=10, ge=1, le=20),
) -> list[CityOut]:
    try:
        rows = CatalogService(CoreRepository(conn)).search_cities(country, q, limit)
    except CoreError as err:
        raise _http(err) from err
    return [CityOut(**row) for row in rows]
