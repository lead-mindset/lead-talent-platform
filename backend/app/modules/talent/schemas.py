import re
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator

from app.modules.core.schemas import PersonOut

_EMAIL = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")

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


# ------------------------------------------------------------- lectura de CV con IA
MAX_CV_SKILLS = 15


def _clean_str(value: object, max_len: int) -> str | None:
    if not isinstance(value, str):
        return None
    value = " ".join(value.split())
    return value[:max_len] if value else None


class CvLanguage(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    level: str | None = Field(default=None, max_length=40)


class CvExtraction(BaseModel):
    """Respuesta del modelo, validada. Lo que no cumple se descarta (queda en null), no se corrige."""

    given_names: str | None = None
    family_names: str | None = None
    email: str | None = None
    phone: str | None = None
    linkedin: str | None = None
    city: str | None = None
    country: str | None = None
    university: str | None = None
    program: str | None = None
    graduation_year: int | None = None
    career_stage: CareerStage | None = None
    skills: list[str] = Field(default_factory=list)
    languages: list[CvLanguage] = Field(default_factory=list)

    @field_validator("given_names", "family_names", "city", mode="before")
    @classmethod
    def short_text(cls, v: object) -> str | None:
        return _clean_str(v, 80)

    @field_validator("university", "program", mode="before")
    @classmethod
    def long_text(cls, v: object) -> str | None:
        return _clean_str(v, 160)

    @field_validator("phone", mode="before")
    @classmethod
    def phone_text(cls, v: object) -> str | None:
        return _clean_str(v, 40)

    @field_validator("email", mode="before")
    @classmethod
    def email_only(cls, v: object) -> str | None:
        v = _clean_str(v, 160)
        return v if v and _EMAIL.fullmatch(v) else None

    @field_validator("linkedin", mode="before")
    @classmethod
    def linkedin_only(cls, v: object) -> str | None:
        v = _clean_str(v, 200)
        return v if v and "linkedin.com/" in v.lower() else None

    @field_validator("country", mode="before")
    @classmethod
    def iso_country(cls, v: object) -> str | None:
        v = _clean_str(v, 2)
        return v.upper() if v and len(v) == 2 and v.isalpha() else None

    @field_validator("graduation_year", mode="before")
    @classmethod
    def plausible_year(cls, v: object) -> int | None:
        return v if isinstance(v, int) and not isinstance(v, bool) and 1990 <= v <= 2045 else None

    @field_validator("career_stage", mode="before")
    @classmethod
    def known_stage(cls, v: object) -> object:
        return v if v in CareerStage.__args__ else None  # type: ignore[attr-defined]

    @field_validator("skills", mode="before")
    @classmethod
    def clean_skills(cls, v: object) -> list[str]:
        if not isinstance(v, list):
            return []
        out: list[str] = []
        for item in v:
            skill = _clean_str(item, 60)
            if skill and skill.lower() not in {s.lower() for s in out}:
                out.append(skill)
        return out[:MAX_CV_SKILLS]

    @field_validator("languages", mode="before")
    @classmethod
    def clean_languages(cls, v: object) -> list[dict]:
        if not isinstance(v, list):
            return []
        out = []
        for item in v:
            if isinstance(item, dict) and _clean_str(item.get("name"), 40):
                out.append({"name": _clean_str(item["name"], 40), "level": _clean_str(item.get("level"), 40)})
        return out[:10]


class ResumeParseIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # El mismo session_id del embudo: si la lectura falla, el evento cv_lectura_fallida queda
    # en la misma sesión. Sin datos personales.
    session_id: UUID | None = None
    device: Device | None = None


class CvSuggestions(BaseModel):
    """Sugerencias para prellenar el registro. No se guardan: el estudiante las confirma."""

    given_names: str | None = None
    family_names: str | None = None
    email: str | None = None
    phone: str | None = None
    linkedin: str | None = None
    country_code: str | None = None  # solo si está en core.country
    city_id: int | None = None  # coincidencia clara en core.city
    city_name: str | None = None
    city_admin1: str | None = None
    city_other: str | None = None  # texto del CV si no hubo coincidencia
    university_id: UUID | None = None  # coincidencia clara en core.university
    university_name: str | None = None  # del catálogo o, si no hubo coincidencia, del CV
    major: str | None = None
    graduation_year: int | None = None
    career_stage: CareerStage | None = None
    skills: list[str] = Field(default_factory=list)
    languages: list[CvLanguage] = Field(default_factory=list)


class ResumeParseOut(BaseModel):
    status: Literal["ok", "failed"]
    # Si status es failed: sin_cv, formato_no_soportado, sin_texto, archivo_danado,
    # cv_no_disponible, limite_alcanzado, ia_desactivada, ia_no_disponible, timeout,
    # respuesta_invalida.
    reason: str | None = None
    suggestions: CvSuggestions | None = None
