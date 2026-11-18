"""Lectura del CV con IA: devuelve sugerencias para el registro. No guarda nada del perfil.

Flujo: persona → CV vigente → límite por hora → descargar de Storage → extraer texto →
modelo (structured outputs) → validar → cruzar con los catálogos → sugerencias.

Privacidad: el texto del CV y la respuesta del modelo solo viven en memoria durante el request.
En los logs va una línea por lectura con duración, tokens, resultado, campos vacíos y si
hubo coincidencia con los catálogos. Nunca valores.
"""

import json
import logging
import time
import unicodedata
from datetime import UTC, datetime, timedelta
from typing import Any, Protocol
from uuid import UUID

from pydantic import ValidationError

from app.core.config import Settings
from app.core.logging import set_person_id
from app.core.storage import Storage
from app.modules.core.service import CatalogService, CoreError
from app.modules.talent.cv_ai import CvModel, CvModelError
from app.modules.talent.resume_text import ExtractionError, extract_text, file_kind, truncate
from app.modules.talent.schemas import CvExtraction, CvSuggestions, ResumeParseIn
from app.modules.talent.service import TalentError

log = logging.getLogger("lead_talent.cv")

EVENT_NAME = "cv_lectura_fallida"
EVENT_STEP = 2  # la lectura ocurre en el paso 2 del registro

# Estas fallas no son del estudiante ni de la IA (no hay CV, o la IA está apagada a propósito):
# no se registran como cv_lectura_fallida en el embudo.
NOT_FUNNEL_FAILURES = {"sin_cv", "ia_desactivada"}


class ParseRepo(Protocol):
    def get_current_resume(self, person_id: str) -> dict[str, Any] | None: ...
    def count_parse_attempts(self, person_id: str, since: datetime) -> int: ...
    def insert_parse_attempt(self, person_id: str) -> None: ...
    def insert_event(self, data: dict[str, Any]) -> None: ...


class CoreRepo(Protocol):
    def get_person_by_auth_user(self, auth_user_id: str) -> dict[str, Any] | None: ...
    def search_universities(self, query: str, limit: int = 20) -> list[dict[str, Any]]: ...
    def country_exists(self, code: str) -> bool: ...
    def search_cities(self, country_code: str, query: str, limit: int) -> list[dict[str, Any]]: ...


class ParseFailure(Exception):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def normalize(value: str) -> str:
    """Minúsculas, sin tildes y sin espacios de sobra, para comparar nombres."""
    text = unicodedata.normalize("NFD", value.lower())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return " ".join(text.replace("-", " ").split())


class ResumeParseService:
    def __init__(
        self,
        core: CoreRepo,
        talent: ParseRepo,
        storage: Storage,
        model: CvModel | None,
        settings: Settings,
        now: Any = None,
    ) -> None:
        self.core = core
        self.talent = talent
        self.storage = storage
        self.model = model
        self.settings = settings
        self.catalog = CatalogService(core)
        self._now = now or (lambda: datetime.now(UTC))

    def parse(self, auth_user_id: str, data: ResumeParseIn) -> dict[str, Any]:
        person = self.core.get_person_by_auth_user(auth_user_id)
        if person is None:
            raise TalentError("email_not_confirmed", "Confirma tu email para continuar")
        person_id = str(person["id"])
        set_person_id(person_id)

        started = time.perf_counter()
        # Solo métricas y nombres de campos. Nunca valores del CV.
        stats: dict[str, Any] = {
            "file_type": None,
            "chars": 0,
            "prompt_tokens": 0,
            "completion_tokens": 0,
        }
        try:
            suggestions = self._run(person_id, stats)
        except ParseFailure as failure:
            self._record_failure(failure.reason, data)
            self._log(started, stats, result=failure.reason)
            return {"status": "failed", "reason": failure.reason, "suggestions": None}

        self._log(started, stats, result="ok")
        return {"status": "ok", "reason": None, "suggestions": suggestions}

    # ------------------------------------------------------------------ pasos
    def _run(self, person_id: str, stats: dict[str, Any]) -> CvSuggestions:
        resume = self.talent.get_current_resume(person_id)
        if resume is None:
            raise ParseFailure("sin_cv")
        stats["file_type"] = file_kind(resume["mime_type"], resume["file_name"])

        if self.model is None:
            raise ParseFailure("ia_desactivada")

        since = self._now() - timedelta(hours=1)
        if (
            self.talent.count_parse_attempts(person_id, since)
            >= self.settings.cv_parse_max_per_hour
        ):
            raise ParseFailure("limite_alcanzado")
        # Antes de llamar a Azure: cuenta todos los intentos, también los que fallan.
        self.talent.insert_parse_attempt(person_id)

        try:
            content = self.storage.download(self.settings.resume_bucket, resume["storage_path"])
        except Exception as err:
            log.warning("no se pudo descargar el CV", extra={"error_type": type(err).__name__})
            raise ParseFailure("cv_no_disponible") from err

        try:
            text = extract_text(content, resume["mime_type"], resume["file_name"])
        except ExtractionError as err:
            raise ParseFailure(err.reason) from err
        text = truncate(text, self.settings.cv_text_max_chars)
        stats["chars"] = len(text)

        if self.settings.cv_debug_allowed:
            # Solo con LOG_CV_DEBUG=true y ENV=local. El RedactFilter lo borra en cualquier otro caso.
            log.info("cv_debug", extra={"cv_text": text, "cv_debug": True})

        try:
            result = self.model.extract(text)
        except CvModelError as err:
            stats.update(err.diagnostics())
            raise ParseFailure(err.reason) from err
        stats["prompt_tokens"] = result.prompt_tokens
        stats["completion_tokens"] = result.completion_tokens

        extraction = self._validate(result.content, result.finish_reason)
        stats["empty_fields"] = sorted(
            name for name, value in extraction.model_dump().items() if value in (None, [], "")
        )
        return self._match_catalogs(extraction, stats)

    def _validate(self, content: str | None, finish_reason: str | None) -> CvExtraction:
        # "length": el modelo se quedó sin tokens y el JSON quedó cortado.
        if not content or finish_reason not in (None, "stop"):
            raise ParseFailure("respuesta_invalida")
        try:
            raw = json.loads(content)
        except ValueError as err:
            raise ParseFailure("respuesta_invalida") from err
        if not isinstance(raw, dict):
            raise ParseFailure("respuesta_invalida")
        try:
            extraction = CvExtraction.model_validate(raw)
        except ValidationError as err:
            raise ParseFailure("respuesta_invalida") from err
        # Un objeto sin ningún dato útil (claves equivocadas, todo null) no sirve para prellenar.
        if not any(v not in (None, []) for v in extraction.model_dump().values()):
            raise ParseFailure("respuesta_invalida")
        return extraction

    def _match_catalogs(self, cv: CvExtraction, stats: dict[str, Any]) -> CvSuggestions:
        out = CvSuggestions(
            given_names=cv.given_names,
            family_names=cv.family_names,
            email=cv.email,
            phone=cv.phone,
            linkedin=cv.linkedin,
            major=cv.program,
            graduation_year=cv.graduation_year,
            career_stage=cv.career_stage,
            skills=cv.skills,
            languages=cv.languages,
        )

        if cv.country and self.core.country_exists(cv.country):
            out.country_code = cv.country

        # Ciudad: solo una coincidencia exacta (nombre o alias) en el país sugerido.
        stats["city_match"] = None
        if cv.city:
            stats["city_match"] = False
            match = self._match_city(out.country_code, cv.city)
            if match:
                out.city_id, out.city_name, out.city_admin1 = (
                    match["id"],
                    match["name"],
                    match["admin1"],
                )
                stats["city_match"] = True
            else:
                out.city_other = cv.city

        # Universidad: mismo nombre (sin tildes ni mayúsculas) que una del catálogo.
        stats["university_match"] = None
        if cv.university:
            stats["university_match"] = False
            match = self._match_university(cv.university, out.country_code)
            if match:
                out.university_id, out.university_name = UUID(str(match["id"])), match["name"]
                stats["university_match"] = True
            else:
                out.university_name = cv.university
        return out

    def _match_city(self, country: str | None, city: str) -> dict[str, Any] | None:
        if not country:
            return None
        try:
            results = self.catalog.search_cities(country, city, limit=5)
        except CoreError:
            return None
        return next((r for r in results if r.get("exact")), None)

    def _match_university(self, name: str, country: str | None) -> dict[str, Any] | None:
        target = normalize(name)
        candidates = [
            u for u in self.core.search_universities(name, 20) if normalize(u["name"]) == target
        ]
        if country:
            same_country = [u for u in candidates if u.get("country_code") == country]
            candidates = same_country or candidates
        return candidates[0] if len(candidates) == 1 else None

    # ------------------------------------------------------------ registro
    def _record_failure(self, reason: str, data: ResumeParseIn) -> None:
        if reason in NOT_FUNNEL_FAILURES or data.session_id is None or data.device is None:
            return
        self.talent.insert_event(
            {
                "session_id": str(data.session_id),
                "name": EVENT_NAME,
                "step": EVENT_STEP,
                "device": data.device,
                "seconds_on_step": None,
                "reason": reason,
            }
        )

    def _log(self, started: float, stats: dict[str, Any], result: str) -> None:
        log.info(
            "cv_parse",
            extra={
                **stats,
                "result": result,
                "duration_ms": round((time.perf_counter() - started) * 1000),
            },
        )
