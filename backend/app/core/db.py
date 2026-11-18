"""Conexión a Postgres de Supabase.

En Vercel (serverless) se abre una conexión por request contra el pooler en
modo transacción. prepare_threshold=None es obligatorio con ese pooler.
"""

from collections.abc import Iterator
from typing import Annotated

import psycopg
from fastapi import Depends
from psycopg.rows import dict_row

from app.core.config import Settings, get_settings


def get_conn(settings: Annotated[Settings, Depends(get_settings)]) -> Iterator[psycopg.Connection]:
    with psycopg.connect(
        settings.database_url, row_factory=dict_row, prepare_threshold=None
    ) as conn:
        yield conn


Conn = Annotated[psycopg.Connection, Depends(get_conn)]
