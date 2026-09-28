"""Page-aware PDF text extraction (Phase 3A). Uses pypdf per the brief —
never shells out, never touches a filesystem path itself (it's handed raw
bytes by the caller, which got them from the gateway's private upload)."""

from __future__ import annotations

import io

from pypdf import PdfReader

from app.schemas.tender_analysis import PageText


class EmptyPdfTextError(Exception):
    """Raised when a PDF has zero extractable text on every page (e.g. a
    pure image/scan with no text layer). We never silently return an empty
    requirement list for this — see app/api/analyze.py."""


def extract_pages(file_bytes: bytes) -> list[PageText]:
    reader = PdfReader(io.BytesIO(file_bytes))
    pages: list[PageText] = []
    for i, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        pages.append(PageText(page=i, text=text))

    if not any(p.text for p in pages):
        raise EmptyPdfTextError("This PDF contains no extractable text (likely a scanned image with no text layer). AI analysis cannot proceed on it.")

    return pages


def to_page_aware_text(pages: list[PageText], max_chars: int) -> str:
    """Joins pages as `PAGE N:\n...` blocks, capped to max_chars so the
    prompt fits the model's context window. llama3:8b's default context here
    is ~8K tokens; capping input text is an explicit MVP limitation (see the
    Phase 3A report) rather than chunking/summarizing across the whole
    document — a large tender may only have its first N pages analyzed."""
    blocks: list[str] = []
    total = 0
    for p in pages:
        if not p.text:
            continue
        block = f"PAGE {p.page}:\n{p.text}\n"
        if total + len(block) > max_chars:
            remaining = max_chars - total
            if remaining > 200:
                blocks.append(block[:remaining])
            break
        blocks.append(block)
        total += len(block)
    return "\n".join(blocks)
