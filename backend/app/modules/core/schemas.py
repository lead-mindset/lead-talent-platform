from uuid import UUID

from pydantic import BaseModel


class UniversityOut(BaseModel):
    id: UUID
    name: str
    country_code: str


class CountryOut(BaseModel):
    code: str
    name_es: str
    name_en: str


class CityOut(BaseModel):
    id: int
    name: str
    admin1: str | None
    country_code: str


class PersonOut(BaseModel):
    id: UUID
    email: str
    given_names: str | None
    family_names: str | None
    full_name: str | None
    country_code: str | None
    city_id: int | None = None
    city_name: str | None = None  # para mostrar: nombre del catálogo
    city_admin1: str | None = None  # región o estado de la ciudad del catálogo
    city_other: str | None = None  # texto libre si no encontró su ciudad
    university_id: UUID | None
    university_other: str | None
    university_name: str | None = None
    major: str | None
    graduation_year: int | None
    linkedin_url: str | None


class MeOut(BaseModel):
    person: PersonOut
    roles: dict[str, list[str]]
