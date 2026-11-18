from fastapi import APIRouter, HTTPException, Query, status

from app.core.db import Conn
from app.core.security import CurrentUser
from app.modules.core.repository import CoreRepository
from app.modules.core.schemas import MeOut, PersonOut, UniversityOut

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
