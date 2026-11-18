from uuid import UUID

from pydantic import BaseModel


class UniversityOut(BaseModel):
    id: UUID
    name: str
    country_code: str


class PersonOut(BaseModel):
    id: UUID
    email: str
    given_names: str | None
    family_names: str | None
    full_name: str | None
    city: str | None
    country_code: str | None
    university_id: UUID | None
    university_other: str | None
    university_name: str | None = None
    major: str | None
    graduation_year: int | None
    linkedin_url: str | None


class MeOut(BaseModel):
    person: PersonOut
    roles: dict[str, list[str]]
