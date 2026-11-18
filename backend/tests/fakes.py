"""Repositorios y storage en memoria para probar el servicio sin base de datos."""

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

PERSON_ID = "11111111-1111-1111-1111-111111111111"
AUTH_ID = "22222222-2222-2222-2222-222222222222"
UNIVERSITY_ID = "33333333-3333-3333-3333-333333333333"


def make_person(**overrides: Any) -> dict[str, Any]:
    base = {
        "id": PERSON_ID,
        "email": "valeria@mail.com",
        "given_names": None,
        "family_names": None,
        "full_name": None,
        "city": None,
        "country_code": None,
        "university_id": None,
        "university_other": None,
        "university_name": None,
        "major": None,
        "graduation_year": None,
        "linkedin_url": None,
    }
    return {**base, **overrides}


class FakeCore:
    def __init__(self, person: dict[str, Any] | None = None) -> None:
        self.persons = {AUTH_ID: person} if person else {}
        self.roles: set[tuple[str, str, str]] = set()
        self.universities = {UNIVERSITY_ID}

    def get_person_by_auth_user(self, auth_user_id: str) -> dict[str, Any] | None:
        return self.persons.get(auth_user_id)

    def update_person_basics(self, person_id: str, fields: dict[str, Any]) -> dict[str, Any]:
        for auth_id, p in self.persons.items():
            if p["id"] == person_id:
                merged = {**p, **fields}
                names = [merged.get("given_names"), merged.get("family_names")]
                merged["full_name"] = " ".join(n for n in names if n) or None
                self.persons[auth_id] = merged
                return merged
        raise KeyError(person_id)

    def add_role(self, person_id: str, app: str, role: str) -> None:
        self.roles.add((person_id, app, role))

    def university_exists(self, university_id: str) -> bool:
        return university_id in self.universities


class FakeTalent:
    def __init__(self) -> None:
        self.profiles: dict[str, dict[str, Any]] = {}
        self.resumes: list[dict[str, Any]] = []

    def get_profile(self, person_id: str) -> dict[str, Any] | None:
        return self.profiles.get(person_id)

    def upsert_profile(self, person_id: str, data: dict[str, Any]) -> dict[str, Any]:
        self.profiles[person_id] = {**self.profiles.get(person_id, {}), **data}
        return self.profiles[person_id]

    def get_current_resume(self, person_id: str) -> dict[str, Any] | None:
        return next(
            (r for r in self.resumes if r["person_id"] == person_id and r["is_current"]), None
        )

    def replace_current_resume(self, person_id: str, data: dict[str, Any]) -> dict[str, Any]:
        for r in self.resumes:
            if r["person_id"] == person_id:
                r["is_current"] = False
        row = {
            "id": str(uuid4()),
            "person_id": person_id,
            "is_current": True,
            "uploaded_at": datetime.now(UTC),
            **data,
        }
        self.resumes.append(row)
        return row


class FakeStorage:
    def __init__(self) -> None:
        self.uploads: list[tuple[str, str]] = []

    def create_signed_upload_url(self, bucket: str, path: str) -> str:
        self.uploads.append((bucket, path))
        return f"https://storage.test/upload/{bucket}/{path}?token=t"

    def create_signed_download_url(self, bucket: str, path: str, expires_in: int) -> str:
        return f"https://storage.test/download/{bucket}/{path}?exp={expires_in}"
