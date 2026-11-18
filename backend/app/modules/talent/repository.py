"""Acceso a datos del schema talent. Solo SQL, sin reglas de negocio."""

from typing import Any

import psycopg

PROFILE_COLUMNS = """
  career_stage, headline, english_level, skills, top_skills, target_roles, availability,
  recruiter_visible, recruiter_visible_consented_at, onboarding_completed_at
"""
RESUME_COLUMNS = "id, storage_path, file_name, mime_type, size_bytes, uploaded_at"


class TalentRepository:
    def __init__(self, conn: psycopg.Connection) -> None:
        self.conn = conn

    def get_profile(self, person_id: str) -> dict[str, Any] | None:
        return self.conn.execute(
            f"select {PROFILE_COLUMNS} from talent.profile where person_id = %s",
            (person_id,),
        ).fetchone()

    def upsert_profile(self, person_id: str, data: dict[str, Any]) -> dict[str, Any]:
        cols = list(data)
        insert_cols = ", ".join(["person_id", *cols])
        values = ", ".join(["%(person_id)s", *(f"%({c})s" for c in cols)])
        updates = ", ".join(f"{c} = excluded.{c}" for c in cols)
        return self.conn.execute(
            f"insert into talent.profile ({insert_cols}) values ({values}) "
            f"on conflict (person_id) do update set {updates} "
            f"returning {PROFILE_COLUMNS}",
            {**data, "person_id": person_id},
        ).fetchone()

    def get_current_resume(self, person_id: str) -> dict[str, Any] | None:
        return self.conn.execute(
            f"select {RESUME_COLUMNS} from talent.resume where person_id = %s and is_current",
            (person_id,),
        ).fetchone()

    def replace_current_resume(self, person_id: str, data: dict[str, Any]) -> dict[str, Any]:
        self.conn.execute(
            "update talent.resume set is_current = false where person_id = %s and is_current",
            (person_id,),
        )
        return self.conn.execute(
            "insert into talent.resume (person_id, storage_path, file_name, mime_type, size_bytes) "
            "values (%(person_id)s, %(storage_path)s, %(file_name)s, %(mime_type)s, %(size_bytes)s) "
            f"returning {RESUME_COLUMNS}",
            {**data, "person_id": person_id},
        ).fetchone()

    def insert_event(self, data: dict[str, Any]) -> None:
        self.conn.execute(
            "insert into talent.registration_event "
            "(session_id, name, step, device, seconds_on_step, reason) "
            "values (%(session_id)s, %(name)s, %(step)s, %(device)s, "
            "%(seconds_on_step)s, %(reason)s)",
            data,
        )
