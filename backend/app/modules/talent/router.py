from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.core.config import Settings, get_settings
from app.core.db import Conn
from app.core.security import CurrentUser
from app.core.storage import Storage, get_storage
from app.modules.core.repository import CoreRepository
from app.modules.talent.repository import TalentRepository
from app.modules.talent.schemas import (
    FunnelEventIn,
    ProfileIn,
    ProfileOut,
    ResumeConfirmIn,
    ResumeOut,
    ResumeUploadIn,
    ResumeUploadOut,
)
from app.modules.talent.service import TalentError, TalentService

router = APIRouter(prefix="/talent", tags=["talent"])

ERROR_STATUS = {
    "email_not_confirmed": status.HTTP_409_CONFLICT,
    "university_not_found": 422,
    "country_not_found": 422,
    "city_not_in_country": 422,
    "invalid_file_type": 422,
    "file_too_large": 413,
    "forbidden_path": status.HTTP_403_FORBIDDEN,
}


def get_service(
    conn: Conn,
    storage: Annotated[Storage, Depends(get_storage)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> TalentService:
    return TalentService(CoreRepository(conn), TalentRepository(conn), storage, settings)


Service = Annotated[TalentService, Depends(get_service)]


def _http(err: TalentError) -> HTTPException:
    return HTTPException(ERROR_STATUS.get(err.code, 400), {"code": err.code, "message": err.message})


@router.get("/profile", response_model=ProfileOut)
def get_profile(user: CurrentUser, service: Service) -> ProfileOut:
    try:
        return ProfileOut(**service.get_profile(user.id))
    except TalentError as err:
        raise _http(err) from err


@router.put("/profile", response_model=ProfileOut)
def save_profile(body: ProfileIn, user: CurrentUser, service: Service) -> ProfileOut:
    try:
        return ProfileOut(**service.save_profile(user.id, body))
    except TalentError as err:
        raise _http(err) from err


@router.post("/resume/upload-url", response_model=ResumeUploadOut)
def request_resume_upload(body: ResumeUploadIn, user: CurrentUser, service: Service) -> ResumeUploadOut:
    try:
        return ResumeUploadOut(**service.request_resume_upload(user.id, body))
    except TalentError as err:
        raise _http(err) from err


@router.post("/resume", response_model=ResumeOut, status_code=status.HTTP_201_CREATED)
def confirm_resume_upload(body: ResumeConfirmIn, user: CurrentUser, service: Service) -> ResumeOut:
    try:
        return ResumeOut(**service.confirm_resume_upload(user.id, body))
    except TalentError as err:
        raise _http(err) from err


@router.get("/resume", response_model=ResumeOut, responses={204: {"description": "Sin resume"}})
def get_current_resume(user: CurrentUser, service: Service) -> ResumeOut | Response:
    try:
        resume = service.get_current_resume(user.id)
    except TalentError as err:
        raise _http(err) from err
    if resume is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    return ResumeOut(**resume)


@router.post("/events", status_code=status.HTTP_204_NO_CONTENT)
def record_event(body: FunnelEventIn, user: CurrentUser, service: Service) -> Response:
    """Evento del embudo de registro. Exige sesión, pero no guarda quién lo mandó."""
    service.record_event(body)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
