from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator

from app.modules.core.schemas import PersonOut

EnglishLevel = Literal["basico", "intermedio", "avanzado", "nativo"]
Availability = Literal["practicas", "part", "full"]
# Paso 1 del registro: "¿Cuál te describe mejor?"
CareerStage = Literal[
    "estudiante_universitario", "recien_graduado", "posgrado", "profesional_joven"
]

RESUME_MIME_TYPES: dict[str, str] = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}


class ProfileIn(BaseModel):
    # core.person
    given_names: str = Field(min_length=1, max_length=80)
    family_names: str | None = Field(default=None, max_length=80)
    country_code: str = Field(pattern=r"^[A-Z]{2}$")
    city_id: int | None = Field(default=None, gt=0)  # core.city (geonameid)
    city_other: str | None = Field(default=None, max_length=80)  # si no encontró su ciudad
    linkedin_url: HttpUrl | None = None
    university_id: UUID | None = None
    university_other: str | None = Field(default=None, max_length=160)
    major: str | None = Field(default=None, max_length=120)
    graduation_year: int | None = Field(default=None, ge=1990, le=2045)
    # talent.profile
    career_stage: CareerStage | None = None
    headline: str | None = Field(default=None, max_length=160)
    english_level: EnglishLevel | None = None
    skills: list[str] = Field(default_factory=list, max_length=30)
    top_skills: list[str] = Field(default_factory=list, max_length=3)
    target_roles: list[str] = Field(default_factory=list, max_length=5)
    availability: Availability | None = None
    recruiter_visible: bool = False

    @field_validator("given_names", "family_names", "city_other", "university_other", "major", "headline")
    @classmethod
    def strip(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        return v or None

    @field_validator("linkedin_url")
    @classmethod
    def linkedin_only(cls, v: HttpUrl | None) -> HttpUrl | None:
        if v is None:
            return None
        host = v.host or ""
        if v.scheme != "https" or not (host == "linkedin.com" or host.endswith(".linkedin.com")):
            raise ValueError("Debe ser una URL https de LinkedIn")
        return v

    @model_validator(mode="after")
    def check_rules(self) -> "ProfileIn":
        if not self.given_names:
            raise ValueError("Escribe tu nombre")
        if self.city_id is not None and self.city_other:
            raise ValueError("Elige una ciudad de la lista o escríbela, no las dos")
        if self.university_id is None and not self.university_other:
            raise ValueError("Indica tu universidad")
        if not set(self.top_skills) <= set(self.skills):
            raise ValueError("Tus skills destacadas deben estar en tu lista de skills")
        return self


class TalentProfileOut(BaseModel):
    career_stage: str | None = None
    headline: str | None
    english_level: str | None
    skills: list[str]
    top_skills: list[str]
    target_roles: list[str]
    availability: str | None
    recruiter_visible: bool
    recruiter_visible_consented_at: datetime | None
    onboarding_completed_at: datetime | None


class ProfileOut(BaseModel):
    person: PersonOut
    profile: TalentProfileOut | None


class ResumeUploadIn(BaseModel):
    file_name: str = Field(min_length=1, max_length=200)
    mime_type: str
    size_bytes: int = Field(gt=0)


class ResumeUploadOut(BaseModel):
    upload_url: str
    storage_path: str


class ResumeConfirmIn(BaseModel):
    storage_path: str = Field(min_length=3, max_length=300)
    file_name: str = Field(min_length=1, max_length=200)
    mime_type: str
    size_bytes: int = Field(gt=0)


class ResumeOut(BaseModel):
    id: UUID
    file_name: str
    mime_type: str
    size_bytes: int
    uploaded_at: datetime
    download_url: str | None = None


# ------------------------------------------------------------ embudo del registro
FunnelEventName = Literal[
    "registro_paso_visto",
    "registro_paso_completado",
    "cv_subido",
    "registro_sin_cv",
    "cv_lectura_fallida",
    "registro_terminado",
]
Device = Literal["mobile", "tablet", "desktop"]


class FunnelEventIn(BaseModel):
    """Un evento del embudo. No acepta campos extra: así no entra ningún dato personal."""

    model_config = ConfigDict(extra="forbid")

    session_id: UUID  # aleatorio por intento de registro, lo crea el navegador
    name: FunnelEventName
    step: int = Field(ge=1, le=6)
    device: Device
    seconds_on_step: int | None = Field(default=None, ge=0, le=86400)
    reason: str | None = Field(default=None, pattern=r"^[a-z_]{1,40}$")

    @model_validator(mode="after")
    def reason_only_on_failure(self) -> "FunnelEventIn":
        if self.reason is not None and self.name != "cv_lectura_fallida":
            raise ValueError("reason solo va con cv_lectura_fallida")
        return self
