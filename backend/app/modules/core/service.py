"""Reglas del catálogo de países y ciudades.

El router solo valida la entrada y llama a este servicio.
"""

from typing import Any, Protocol

MIN_QUERY = 2
MAX_LIMIT = 20


class CoreError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class CatalogRepo(Protocol):
    def list_countries(self) -> list[dict[str, Any]]: ...
    def country_exists(self, code: str) -> bool: ...
    def search_cities(self, country_code: str, query: str, limit: int) -> list[dict[str, Any]]: ...


class CatalogService:
    def __init__(self, repo: CatalogRepo) -> None:
        self.repo = repo

    def list_countries(self) -> list[dict[str, Any]]:
        return self.repo.list_countries()

    def search_cities(self, country_code: str, query: str, limit: int = 10) -> list[dict[str, Any]]:
        country = country_code.strip().upper()
        text = " ".join(query.split())  # quita espacios de sobra
        if len(text) < MIN_QUERY:
            raise CoreError("query_too_short", f"Escribe al menos {MIN_QUERY} letras")
        if not self.repo.country_exists(country):
            raise CoreError("country_not_found", "Ese país no está en el catálogo")
        return self.repo.search_cities(country, text, max(1, min(limit, MAX_LIMIT)))
