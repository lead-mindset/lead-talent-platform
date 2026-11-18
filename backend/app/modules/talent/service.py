"""Reglas de negocio de Talent (módulo 1). Toda la lógica vive aquí.

El router solo autentica, valida la entrada y llama a este servicio.
"""

from datetime import UTC, datetime
from pathlib import PurePosixPath
from typing import Any
from uuid import uuid4

from app.core.config import Settings
from app.core.storage import Storage
from app.modules.core.repository import CoreRepository
from app.modules.talent.repository import TalentRepository
from app.modules.talent.schemas import (
    RESUME_MIME_TYPES,
    ProfileIn,
    ResumeConfirmIn,
    ResumeUploadIn,
)

APP = "talent"
STUDENT_ROLE = "student"

PERSON_FIELDS = {
    "given_names", "family_names", "city", "country_code", "linkedin_url", "university_id",
    "university_other", "major", "graduation_year",
}
PROFILE_FIELDS = {"headline", "english_level", "skills", "top_skills", "target_roles", "availability"}


class TalentError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class TalentService:
    def __init__(
        self,
        core: CoreRepository,
        talent: TalentRepository,
        storage: Storage,
        settings: Settings,
        now: Any = None,
    ) -> None:
        self.core = core
        self.talent = talent
        self.storage = storage
        self.settings = settings
        self._now = now or (lambda: datetime.now(UTC))

    # ----------------------------------------------------------------- person
    def _person(self, auth_user_id: str) -> dict[str, Any]:
        person = self.core.get_person_by_auth_user(auth_user_id)
        if person is None:
            raise TalentError("email_not_confirmed", "Confirma tu email para continuar")
        return person

    # ---------------------------------------------------------------- profile
    def get_profile(self, auth_user_id: str) -> dict[str, Any]:
        person = self._person(auth_user_id)
        return {"person": person, "profile": self.talent.get_profile(str(person["id"]))}

    def save_profile(self, auth_user_id: str, data: ProfileIn) -> dict[str, Any]:
        person = self._person(auth_user_id)
        person_id = str(person["id"])

        if data.university_id and not self.core.university_exists(str(data.university_id)):
            raise TalentError("university_not_found", "La universidad no existe")

        payload = data.model_dump(mode="json")
        person_data = {k: payload[k] for k in PERSON_FIELDS}
        if data.university_id:
            person_data["university_other"] = None

        existing = self.talent.get_profile(person_id)
        now = self._now()

        profile_data = {k: payload[k] for k in PROFILE_FIELDS}
        profile_data["recruiter_visible"] = data.recruiter_visible
        # El consentimiento se registra al activar la visibilidad y se borra al quitarla.
        if data.recruiter_visible:
            already = existing and existing.get("recruiter_visible_consented_at")
            profile_data["recruiter_visible_consented_at"] = already or now
        else:
            profile_data["recruiter_visible_consented_at"] = None
        profile_data["onboarding_completed_at"] = (
            existing and existing.get("onboarding_completed_at")
        ) or now

        updated_person = self.core.update_person_basics(person_id, person_data)
        profile = self.talent.upsert_profile(person_id, profile_data)
        self.core.add_role(person_id, APP, STUDENT_ROLE)
        return {"person": updated_person, "profile": profile}

    # ----------------------------------------------------------------- resume
    def _check_file(self, file_name: str, mime_type: str, size_bytes: int) -> str:
        ext = RESUME_MIME_TYPES.get(mime_type)
        if ext is None:
            raise TalentError("invalid_file_type", "Sube un PDF, DOC o DOCX")
        if PurePosixPath(file_name).suffix.lower() != ext:
            raise TalentError("invalid_file_type", "La extensión no coincide con el tipo de archivo")
        if size_bytes > self.settings.resume_max_bytes:
            raise TalentError("file_too_large", "El archivo supera los 10 MB")
        return ext

    def request_resume_upload(self, auth_user_id: str, data: ResumeUploadIn) -> dict[str, str]:
        person = self._person(auth_user_id)
        ext = self._check_file(data.file_name, data.mime_type, data.size_bytes)
        path = f"{person['id']}/{uuid4()}{ext}"
        url = self.storage.create_signed_upload_url(self.settings.resume_bucket, path)
        return {"upload_url": url, "storage_path": path}

    def confirm_resume_upload(self, auth_user_id: str, data: ResumeConfirmIn) -> dict[str, Any]:
        person = self._person(auth_user_id)
        person_id = str(person["id"])
        prefix = f"{person_id}/"
        name = data.storage_path.removeprefix(prefix)
        if not data.storage_path.startswith(prefix) or "/" in name or ".." in name:
            raise TalentError("forbidden_path", "Ese archivo no te pertenece")
        self._check_file(data.file_name, data.mime_type, data.size_bytes)
        return self.talent.replace_current_resume(
            person_id,
            {
                "storage_path": data.storage_path,
                "file_name": data.file_name,
                "mime_type": data.mime_type,
                "size_bytes": data.size_bytes,
            },
        )

    def get_current_resume(self, auth_user_id: str) -> dict[str, Any] | None:
        person = self._person(auth_user_id)
        resume = self.talent.get_current_resume(str(person["id"]))
        if resume is None:
            return None
        url = self.storage.create_signed_download_url(
            self.settings.resume_bucket, resume["storage_path"], self.settings.signed_url_seconds
        )
        return {**resume, "download_url": url}
