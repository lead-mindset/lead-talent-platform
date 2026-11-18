"""Extrae el texto de un CV en memoria. No escribe a disco ni registra el contenido."""

import io
import re
from pathlib import PurePosixPath

PDF = "application/pdf"
DOC = "application/msword"
DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


class ExtractionError(Exception):
    """El CV no se puede leer. `reason` va tal cual a la respuesta y al evento del embudo."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def file_kind(mime_type: str, file_name: str) -> str:
    """pdf, docx, doc u otro. Usa el tipo y, si no alcanza, la extensión."""
    ext = PurePosixPath(file_name).suffix.lower().lstrip(".")
    if mime_type == PDF or ext == "pdf":
        return "pdf"
    if mime_type == DOCX or ext == "docx":
        return "docx"
    if mime_type == DOC or ext == "doc":
        return "doc"
    return "otro"


def _clean(text: str) -> str:
    # Une espacios repetidos y deja como mucho una línea en blanco seguida.
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t\f\v]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _pdf_text(data: bytes) -> str:
    from pypdf import PdfReader
    from pypdf.errors import PdfReadError

    try:
        reader = PdfReader(io.BytesIO(data))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except (PdfReadError, ValueError, KeyError, TypeError) as err:
        raise ExtractionError("archivo_danado") from err


def _docx_text(data: bytes) -> str:
    from docx import Document

    try:
        document = Document(io.BytesIO(data))
    except Exception as err:  # python-docx lanza varios tipos según qué esté roto
        raise ExtractionError("archivo_danado") from err

    parts: list[str] = [p.text for p in document.paragraphs]

    def table_text(table) -> None:
        for row in table.rows:
            cells: list[str] = []
            seen: set[int] = set()
            for cell in row.cells:
                # Las celdas combinadas se repiten en python-docx: se leen una vez.
                if id(cell._tc) in seen:
                    continue
                seen.add(id(cell._tc))
                cells.append(" ".join(p.text for p in cell.paragraphs))
                for nested in cell.tables:
                    table_text(nested)
            parts.append(" | ".join(c for c in cells if c.strip()))

    for table in document.tables:
        table_text(table)
    return "\n".join(parts)


def extract_text(data: bytes, mime_type: str, file_name: str) -> str:
    """Texto limpio del CV. Lanza ExtractionError con formato_no_soportado o sin_texto."""
    kind = file_kind(mime_type, file_name)
    if kind == "pdf":
        text = _pdf_text(data)
    elif kind == "docx":
        text = _docx_text(data)
    else:
        # .doc (Word 97-2003) no se puede leer sin herramientas externas.
        raise ExtractionError("formato_no_soportado")
    text = _clean(text)
    # Un PDF escaneado (solo imágenes) no tiene texto; tampoco un archivo vacío.
    if len(re.sub(r"\W", "", text)) < 20:
        raise ExtractionError("sin_texto")
    return text


def truncate(text: str, max_chars: int) -> str:
    """Corta en el último salto de línea antes del límite, para no partir una línea a la mitad."""
    if len(text) <= max_chars:
        return text
    cut = text[:max_chars]
    newline = cut.rfind("\n")
    return cut[:newline] if newline > max_chars * 0.8 else cut
