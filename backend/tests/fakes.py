"""Repositorios y storage en memoria para probar el servicio sin base de datos."""

from datetime import UTC, datetime
from typing import Any, ClassVar
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
        "country_code": None,
        "country_name": None,
        "city_id": None,
        "city_name": None,
        "city_admin1": None,
        "city_other": None,
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
        self.countries = {"CL", "PE", "US", "PR"}
        self.cities = {3895088: "CL", 3936456: "PE", 4684888: "US"}  # Chillán, Lima, Dallas

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

    def country_exists(self, code: str) -> bool:
        return code in self.countries

    def city_in_country(self, city_id: int, country_code: str) -> bool:
        return self.cities.get(city_id) == country_code

    # Catálogo mínimo para cruzar la lectura del CV.
    city_rows: ClassVar[list[dict[str, Any]]] = [
        {"id": 3895088, "name": "Chillán", "admin1": "Ñuble", "country_code": "CL"},
        {"id": 3936456, "name": "Lima", "admin1": "Lima", "country_code": "PE"},
        {"id": 4684888, "name": "Dallas", "admin1": "Texas", "country_code": "US"},
    ]
    university_rows: ClassVar[list[dict[str, Any]]] = [
        {"id": UNIVERSITY_ID, "name": "Universidad de Concepción", "country_code": "CL"},
    ]

    def search_cities(self, country_code: str, query: str, limit: int) -> list[dict[str, Any]]:
        from app.modules.talent.resume_parse import normalize

        q = normalize(query)
        out = []
        for c in self.city_rows:
            key = normalize(c["name"])
            if c["country_code"] == country_code and key.startswith(q):
                out.append({**c, "exact": key == q})
        return out[:limit]

    def search_universities(self, query: str, limit: int = 20) -> list[dict[str, Any]]:
        q = query.lower()
        return [u for u in self.university_rows if q in u["name"].lower()][:limit]


class FakeTalent:
    def __init__(self) -> None:
        self.profiles: dict[str, dict[str, Any]] = {}
        self.resumes: list[dict[str, Any]] = []
        self.events: list[dict[str, Any]] = []
        self.parse_attempts = []

    def get_profile(self, person_id: str) -> dict[str, Any] | None:
        return self.profiles.get(person_id)

    def upsert_profile(self, person_id: str, data: dict[str, Any]) -> dict[str, Any]:
        self.profiles[person_id] = {**self.profiles.get(person_id, {}), **data}
        return self.profiles[person_id]

    def insert_event(self, data: dict[str, Any]) -> None:
        self.events.append(data)

    # Límite de lecturas con IA. `parse_attempts`: (person_id, created_at).
    parse_attempts: list[tuple[str, datetime]]

    def count_parse_attempts(self, person_id: str, since: datetime) -> int:
        return sum(1 for pid, at in self.parse_attempts if pid == person_id and at >= since)

    def insert_parse_attempt(self, person_id: str) -> None:
        self.parse_attempts.append((person_id, datetime.now(UTC)))

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
        self.files = {}

    def create_signed_upload_url(self, bucket: str, path: str) -> str:
        self.uploads.append((bucket, path))
        return f"https://storage.test/upload/{bucket}/{path}?token=t"

    def create_signed_download_url(self, bucket: str, path: str, expires_in: int) -> str:
        return f"https://storage.test/download/{bucket}/{path}?exp={expires_in}"

    # Bytes por storage_path para la lectura del CV. `fail=True` simula Storage caído.
    files: dict[str, bytes]
    fail: bool = False

    def download(self, bucket: str, path: str) -> bytes:
        if self.fail:
            raise ConnectionError("storage caído")
        return self.files[path]
