"""Logging estructurado en JSON, con request_id y redacción de datos sensibles.

Reglas:
- Nunca se registra el texto del CV, la respuesta del modelo, emails, teléfonos,
  JWT, keys ni los headers Authorization y apikey.
- RedactFilter los borra por si alguien los manda por error, en el mensaje o en `extra`.
- La única excepción es `cv_text` con LOG_CV_DEBUG=true y ENV=local (ver Settings.cv_debug_allowed).
"""

import json
import logging
import re
import sys
import traceback
from collections.abc import Callable
from contextvars import ContextVar, Token
from datetime import UTC, datetime
from typing import Any

LOGGER_NAME = "lead_talent"
REDACTED = "[REDACTED]"

# Contexto del request. Es un dict mutable a propósito: los endpoints síncronos corren en un
# threadpool con una COPIA del contexto, y un ContextVar.set() hecho ahí no vuelve al middleware.
# Al mutar el mismo dict, el person_id que fija el servicio sí llega al log del request.
_request_ctx: ContextVar[dict[str, str | None] | None] = ContextVar("request_ctx", default=None)


def start_request(request_id: str) -> Token:
    return _request_ctx.set({"request_id": request_id, "person_id": None})


def end_request(token: Token) -> None:
    _request_ctx.reset(token)


def set_person_id(person_id: str) -> None:
    ctx = _request_ctx.get()
    if ctx is not None:
        ctx["person_id"] = person_id


def current_request_id() -> str | None:
    ctx = _request_ctx.get()
    return ctx["request_id"] if ctx else None


def current_person_id() -> str | None:
    ctx = _request_ctx.get()
    return ctx["person_id"] if ctx else None


# Campos de `extra` que nunca salen en claro, sin importar su valor.
SENSITIVE_KEYS = {
    "authorization",
    "apikey",
    "api_key",
    "access_token",
    "refresh_token",
    "token",
    "jwt",
    "secret",
    "client_secret",
    "password",
    "email",
    "phone",
    "cv_text",
    "model_response",
    "headers",
}

# Campos propios de LogRecord: no son `extra`.
_STANDARD_ATTRS = set(vars(logging.LogRecord("", 0, "", 0, "", (), None))) | {"message", "asctime"}

# Campos con ids que no se pasan por las expresiones de texto.
_SAFE_KEYS = {"request_id", "person_id", "endpoint", "method", "path"}

_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    # JWT: tres bloques base64url separados por puntos.
    (re.compile(r"eyJ[\w-]+\.[\w-]+\.[\w-]+"), REDACTED),
    # Claves de Supabase.
    (re.compile(r"sb_(?:secret|publishable)_[\w-]+"), REDACTED),
    # Headers "Authorization: Bearer x" o "apikey: x", también como texto.
    (re.compile(r"(?i)\b(bearer)\s+[\w.~+/=-]+"), r"\1 " + REDACTED),
    (
        re.compile(r"(?i)\b(authorization|apikey|api-key|x-api-key)\b(\s*[:=]\s*)[^\s,;}]+"),
        r"\1\2" + REDACTED,
    ),
    # Emails.
    (re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+"), REDACTED),
    # Teléfonos: 8 o más dígitos con separadores comunes (+56 9 0000 0001, (214) 555-0105).
    (re.compile(r"(?<![\w-])\+?\(?\d[\d\s().-]{6,}\d(?![\w-])"), REDACTED),
]


def redact_text(value: str) -> str:
    for pattern, replacement in _PATTERNS:
        value = pattern.sub(replacement, value)
    return value


def _redact_value(key: str, value: Any, allow_cv_text: bool) -> Any:
    lowered = key.lower()
    if lowered == "cv_text" and allow_cv_text:
        return value
    if lowered in SENSITIVE_KEYS:
        return REDACTED
    if lowered in _SAFE_KEYS:
        return value
    if isinstance(value, str):
        return redact_text(value)
    if isinstance(value, dict):
        return {k: _redact_value(str(k), v, allow_cv_text) for k, v in value.items()}
    if isinstance(value, list | tuple):
        return [_redact_value(key, v, allow_cv_text) for v in value]
    return value


class RedactFilter(logging.Filter):
    """Borra datos sensibles del mensaje y de los campos extra antes de escribir el log."""

    def __init__(self, allow_cv_debug: Callable[[], bool] = lambda: False) -> None:
        super().__init__()
        self._allow_cv_debug = allow_cv_debug

    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = redact_text(record.getMessage())
        record.args = ()
        # cv_text solo pasa si el registro lo marca como depuración y el ambiente lo permite.
        allow_cv_text = bool(getattr(record, "cv_debug", False)) and self._allow_cv_debug()
        for key in list(vars(record)):
            if key in _STANDARD_ATTRS:
                continue
            setattr(record, key, _redact_value(key, getattr(record, key), allow_cv_text))
        if record.exc_info and not record.exc_text:
            record.exc_text = redact_text("".join(traceback.format_exception(*record.exc_info)))
        elif record.exc_text:
            record.exc_text = redact_text(record.exc_text)
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        data: dict[str, Any] = {
            "ts": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            "request_id": current_request_id(),
        }
        if current_person_id():
            data["person_id"] = current_person_id()
        for key, value in vars(record).items():
            if key not in _STANDARD_ATTRS and key != "cv_debug":
                data[key] = value
        if record.exc_info and record.exc_info[0] is not None:
            data["error_type"] = record.exc_info[0].__name__
            data["stack"] = record.exc_text or redact_text(
                "".join(traceback.format_exception(*record.exc_info))
            )
        return json.dumps(data, ensure_ascii=False, default=str)


def attach_exporters(logger: logging.Logger, connection_string: str) -> None:
    """Punto preparado para mandar los logs a Azure Application Insights.

    Todavía no se configura. Cuando se active:
      1. `uv add azure-monitor-opentelemetry`
      2. Aquí: `configure_azure_monitor(connection_string=connection_string, logger_name=LOGGER_NAME)`
    El RedactFilter ya corre antes de cualquier handler, así que lo que llegue a Azure va limpio.
    """
    if connection_string.strip():
        logger.warning(
            "Application Insights todavía no está configurado; los logs van solo a stdout."
        )


def setup_logging(
    allow_cv_debug: Callable[[], bool], connection_string: str = ""
) -> logging.Logger:
    logger = logging.getLogger(LOGGER_NAME)
    if getattr(logger, "_lead_configured", False):
        return logger
    redact = RedactFilter(allow_cv_debug)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    # En el logger: limpia lo que se registra con "lead_talent" antes de cualquier handler.
    # En el handler: también cubre lo que llega de loggers hijos ("lead_talent.algo").
    # Redactar dos veces no cambia nada. Todo handler nuevo (Application Insights) debe llevarlo.
    logger.addFilter(redact)
    handler.addFilter(redact)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = True  # pytest (caplog) también lo ve
    logger._lead_configured = True  # type: ignore[attr-defined]
    attach_exporters(logger, connection_string)
    return logger
