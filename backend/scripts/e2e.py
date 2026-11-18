"""Acciones rápidas para probar LEAD Talent de punta a punta, sin pasar por el correo.

Uso (desde backend/):
    uv run python -m scripts.e2e health
    uv run python -m scripts.e2e otp ana+e2e@leadmindset.org
    uv run python -m scripts.e2e token ana+e2e@leadmindset.org
    uv run python -m scripts.e2e me ana+e2e@leadmindset.org
    uv run python -m scripts.e2e profile ana+e2e@leadmindset.org
    uv run python -m scripts.e2e fill-profile ana+e2e@leadmindset.org --visible
    uv run python -m scripts.e2e upload-resume ana+e2e@leadmindset.org ruta/al/cv.pdf
    uv run python -m scripts.e2e reset ana+e2e@leadmindset.org

Usa backend/.env (SUPABASE_URL, SUPABASE_SECRET_KEY, DATABASE_URL).
La API se toma de E2E_API_URL (por defecto http://localhost:8000).

Seguridad: solo crea, modifica o borra cuentas cuyo correo contiene "+e2e@".
Así no puedes tocar una cuenta real por error. `otp` funciona con cualquier correo
porque solo genera un código para entrar (útil para probar en el navegador sin esperar el correo).
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sys
from pathlib import Path
from typing import Any

import httpx
import psycopg
from psycopg.rows import dict_row

from app.core.config import Settings, get_settings

TEST_MARK = "+e2e@"


class E2EError(Exception):
    pass


# ----------------------------------------------------------------- helpers
def is_test_email(email: str) -> bool:
    return TEST_MARK in email.lower()


def require_test_email(email: str) -> None:
    if not is_test_email(email):
        raise E2EError(
            f"Por seguridad, esta acción solo funciona con correos de prueba que contengan '{TEST_MARK}'. "
            f"Ejemplo: tu.nombre+e2e@leadmindset.org"
        )


class Supabase:
    """Llamadas a Supabase Auth y Storage con la secret key (solo backend)."""

    def __init__(self, settings: Settings, client: httpx.Client | None = None) -> None:
        if not settings.supabase_secret_key or "<project-ref>" in settings.supabase_url:
            raise E2EError("Falta configurar SUPABASE_URL y SUPABASE_SECRET_KEY en backend/.env")
        self.url = settings.supabase_url.rstrip("/")
        key = settings.supabase_secret_key
        headers = {"apikey": key}
        if key.startswith("eyJ"):  # service_role legacy (JWT): también va como Bearer
            headers["Authorization"] = f"Bearer {key}"
        self.http = client or httpx.Client(timeout=20, headers=headers)

    def _check(self, r: httpx.Response, what: str) -> dict[str, Any]:
        if r.status_code >= 400:
            raise E2EError(f"{what} falló (HTTP {r.status_code}): {r.text[:300]}")
        return r.json() if r.content else {}

    def health(self) -> dict[str, Any]:
        return self._check(self.http.get(f"{self.url}/auth/v1/health"), "Supabase Auth health")

    def ensure_user(self, email: str) -> None:
        """Crea el usuario ya confirmado. Si existe, no hace nada."""
        r = self.http.post(f"{self.url}/auth/v1/admin/users", json={"email": email, "email_confirm": True})
        if r.status_code in (409, 422) and "exist" in r.text.lower():
            return
        self._check(r, "Crear usuario")

    def generate_otp(self, email: str) -> dict[str, Any]:
        """Genera un código como si se hubiera pedido por correo, pero sin enviar el correo."""
        data = self._check(
            self.http.post(f"{self.url}/auth/v1/admin/generate_link", json={"type": "magiclink", "email": email}),
            "Generar código",
        )
        props = data.get("properties", data)
        otp = props.get("email_otp")
        token_hash = props.get("hashed_token")
        if not otp and not token_hash:
            raise E2EError(f"Supabase no devolvió un código: {json.dumps(data)[:300]}")
        return {"otp": otp, "token_hash": token_hash, "type": props.get("verification_type", "magiclink")}

    def session(self, email: str) -> dict[str, Any]:
        """Inicia sesión sin correo: genera el código y lo canjea por una sesión."""
        link = self.generate_otp(email)
        body = {"type": link["type"], "token_hash": link["token_hash"]}
        data = self._check(self.http.post(f"{self.url}/auth/v1/verify", json=body), "Verificar código")
        if not data.get("access_token"):
            raise E2EError("Supabase no devolvió una sesión")
        return data

    def delete_user(self, user_id: str) -> None:
        self._check(self.http.delete(f"{self.url}/auth/v1/admin/users/{user_id}"), "Borrar usuario")

    def remove_objects(self, bucket: str, paths: list[str]) -> None:
        if paths:
            self._check(
                self.http.request("DELETE", f"{self.url}/storage/v1/object/{bucket}", json={"prefixes": paths}),
                "Borrar archivos",
            )


class Api:
    """Llamadas al backend FastAPI con el token del usuario de prueba."""

    def __init__(self, base: str, token: str, client: httpx.Client | None = None) -> None:
        self.base = base.rstrip("/")
        self.http = client or httpx.Client(timeout=20)
        self.headers = {"Authorization": f"Bearer {token}"}

    def call(self, method: str, path: str, **kw: Any) -> Any:
        try:
            r = self.http.request(method, f"{self.base}/api/v1{path}", headers=self.headers, **kw)
        except httpx.ConnectError as exc:
            raise E2EError(f"No pude conectar con la API en {self.base}. ¿Está corriendo uvicorn?") from exc
        if r.status_code == 204:
            return None
        if r.status_code >= 400:
            raise E2EError(f"{method} {path} falló (HTTP {r.status_code}): {r.text[:400]}")
        return r.json()


SAMPLE_PROFILE: dict[str, Any] = {
    "given_names": "Prueba E2E",
    "family_names": "LEAD",
    "country_code": "PE",
    "city_other": "Lima",
    "linkedin_url": "https://www.linkedin.com/in/prueba-e2e",
    "university_other": "Universidad de Prueba",
    "major": "Ingeniería de Software",
    "graduation_year": 2028,
    "english_level": "intermedio",
    "skills": ["Python", "SQL", "React"],
    "top_skills": ["Python"],
    "target_roles": ["Software Engineer"],
    "availability": "practicas",
    "recruiter_visible": False,
}


def db_connect(settings: Settings) -> psycopg.Connection:
    return psycopg.connect(settings.database_url, row_factory=dict_row, prepare_threshold=None)


def print_json(data: Any) -> None:
    print(json.dumps(data, indent=2, ensure_ascii=False, default=str))


# ---------------------------------------------------------------- commands
def cmd_health(args: argparse.Namespace, settings: Settings) -> None:
    api_url = os.environ.get("E2E_API_URL", "http://localhost:8000")
    checks: list[tuple[str, bool, str]] = []
    try:
        r = httpx.get(f"{api_url}/health", timeout=5)
        checks.append(("API FastAPI", r.status_code == 200, f"{api_url} → HTTP {r.status_code}"))
    except httpx.HTTPError as exc:
        checks.append(("API FastAPI", False, f"{api_url} → {exc.__class__.__name__}"))
    try:
        Supabase(settings).health()
        checks.append(("Supabase Auth", True, settings.supabase_url))
    except (E2EError, httpx.HTTPError) as exc:
        checks.append(("Supabase Auth", False, str(exc)[:200]))
    try:
        with db_connect(settings) as conn:
            n = conn.execute("select count(*) as n from core.person").fetchone()["n"]
        checks.append(("Base de datos", True, f"core.person tiene {n} filas"))
    except Exception as exc:  # noqa: BLE001 - mostrar cualquier error de conexión
        checks.append(("Base de datos", False, str(exc).splitlines()[0][:200]))
    for name, ok, detail in checks:
        print(f"{'OK ' if ok else 'ERR'}  {name:<14} {detail}")
    if not all(ok for _, ok, _ in checks):
        raise SystemExit(1)


def cmd_otp(args: argparse.Namespace, settings: Settings) -> None:
    sb = Supabase(settings)
    if is_test_email(args.email):
        sb.ensure_user(args.email)
    link = sb.generate_otp(args.email)
    if not link["otp"]:
        raise E2EError("Supabase no devolvió un código numérico para este correo")
    print(link["otp"])
    print("Escríbelo en la pantalla de código. Si pides otro código desde la web, este deja de servir.", file=sys.stderr)


def _session_token(args: argparse.Namespace, settings: Settings) -> str:
    require_test_email(args.email)
    sb = Supabase(settings)
    sb.ensure_user(args.email)
    return sb.session(args.email)["access_token"]


def _api(args: argparse.Namespace, settings: Settings) -> Api:
    return Api(os.environ.get("E2E_API_URL", "http://localhost:8000"), _session_token(args, settings))


def cmd_token(args: argparse.Namespace, settings: Settings) -> None:
    print(_session_token(args, settings))


def cmd_me(args: argparse.Namespace, settings: Settings) -> None:
    print_json(_api(args, settings).call("GET", "/me"))


def cmd_profile(args: argparse.Namespace, settings: Settings) -> None:
    print_json(_api(args, settings).call("GET", "/talent/profile"))


def cmd_fill_profile(args: argparse.Namespace, settings: Settings) -> None:
    body = {**SAMPLE_PROFILE, "recruiter_visible": args.visible}
    print_json(_api(args, settings).call("PUT", "/talent/profile", json=body))


def cmd_upload_resume(args: argparse.Namespace, settings: Settings) -> None:
    path = Path(args.file)
    if not path.is_file():
        raise E2EError(f"No existe el archivo {path}")
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    meta = {"file_name": path.name, "mime_type": mime, "size_bytes": path.stat().st_size}
    api = _api(args, settings)
    signed = api.call("POST", "/talent/resume/upload-url", json=meta)
    up = httpx.put(signed["upload_url"], content=path.read_bytes(), headers={"content-type": mime}, timeout=60)
    if up.status_code >= 400:
        raise E2EError(f"La subida a Storage falló (HTTP {up.status_code}): {up.text[:300]}")
    api.call("POST", "/talent/resume", json={**meta, "storage_path": signed["storage_path"]})
    print_json(api.call("GET", "/talent/resume"))


def cmd_reset(args: argparse.Namespace, settings: Settings) -> None:
    """Borra todo lo de un usuario de prueba: archivos, persona (perfil y resumes en cascada) y cuenta."""
    require_test_email(args.email)
    sb = Supabase(settings)
    with db_connect(settings) as conn:
        person = conn.execute(
            "select id from core.person where lower(email) = lower(%s)", (args.email,)
        ).fetchone()
        users = conn.execute(
            "select id from auth.users where lower(email) = lower(%s)", (args.email,)
        ).fetchall()
        paths: list[str] = []
        if person:
            rows = conn.execute(
                "select storage_path from talent.resume where person_id = %s", (person["id"],)
            ).fetchall()
            paths = [r["storage_path"] for r in rows]
        sb.remove_objects(settings.resume_bucket, paths)
        if person:
            conn.execute("delete from core.person where id = %s", (person["id"],))
        conn.commit()
    for user in users:
        sb.delete_user(str(user["id"]))
    print(f"Listo: {len(paths)} archivo(s), {'1' if person else '0'} persona y {len(users)} cuenta(s) borradas.")


COMMANDS = {
    "health": (cmd_health, "Revisa API, Supabase Auth y base de datos", False),
    "otp": (cmd_otp, "Genera un código para entrar sin esperar el correo", True),
    "token": (cmd_token, "Imprime un access token de un usuario de prueba", True),
    "me": (cmd_me, "GET /me con un usuario de prueba", True),
    "profile": (cmd_profile, "GET /talent/profile con un usuario de prueba", True),
    "fill-profile": (cmd_fill_profile, "Completa el perfil con datos de ejemplo", True),
    "upload-resume": (cmd_upload_resume, "Sube un CV (PDF, DOC o DOCX)", True),
    "reset": (cmd_reset, "Borra el usuario de prueba y todos sus datos", True),
}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="scripts.e2e", description="Acciones rápidas de prueba para LEAD Talent")
    sub = parser.add_subparsers(dest="command", required=True)
    for name, (_, help_text, needs_email) in COMMANDS.items():
        p = sub.add_parser(name, help=help_text)
        if needs_email:
            p.add_argument("email")
        if name == "fill-profile":
            p.add_argument("--visible", action="store_true", help="Activa la visibilidad para empresas")
        if name == "upload-resume":
            p.add_argument("file")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        COMMANDS[args.command][0](args, get_settings())
    except E2EError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
