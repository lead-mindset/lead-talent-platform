"""Extracción de texto de los CVs de ejemplo (tests/fixtures/cvs)."""

import json
import unicodedata
from pathlib import Path

import pytest

from app.modules.talent.resume_text import DOCX, PDF, ExtractionError, extract_text, truncate

CVS = Path(__file__).parent / "fixtures" / "cvs"
EXPECTED = json.loads((CVS / "expected.json").read_text(encoding="utf-8"))
FILES = sorted(p.name for p in CVS.iterdir() if p.suffix in {".pdf", ".docx"})


def plain(value: str) -> str:
    text = unicodedata.normalize("NFD", value.lower())
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


def test_there_are_five_fixtures():
    assert len(FILES) == 5


@pytest.mark.parametrize("name", FILES)
def test_text_has_name_and_email(name):
    path = CVS / name
    text = extract_text(path.read_bytes(), PDF if path.suffix == ".pdf" else DOCX, name)
    expected = EXPECTED[name]
    assert expected["email"] in text
    assert plain(expected["given_names"].split()[0]) in plain(text)
    assert plain(expected["family_names"].split()[0]) in plain(text)


def test_docx_tables_are_read():
    path = CVS / "04_Carlos_Gomez_HojaDeVida.docx"
    text = extract_text(path.read_bytes(), DOCX, path.name)
    assert "Universidad de Antioquia" in text


def test_doc_is_not_supported():
    with pytest.raises(ExtractionError) as info:
        extract_text(b"\xd0\xcf\x11\xe0", "application/msword", "cv.doc")
    assert info.value.reason == "formato_no_soportado"


def test_truncate_cuts_on_line_break():
    text = "\n".join(f"linea {i:03d}" for i in range(100))
    out = truncate(text, 200)
    assert len(out) <= 200 and out.endswith(("8", "9", "0", "1", "2", "3", "4", "5", "6", "7"))
    assert truncate("corto", 200) == "corto"
