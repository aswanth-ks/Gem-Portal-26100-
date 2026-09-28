"""Tests 3 & 6 (PDF extraction, missing/empty text handling)."""

import io
from pathlib import Path

import pytest
from pypdf import PdfWriter

from app.pipelines.extraction.pdf_text import EmptyPdfTextError, extract_pages, to_page_aware_text

REAL_TENDER_PDF = Path(__file__).resolve().parents[3] / "docs" / "Tender_document" / "CPCL_PROC_2026_041_CCTV_Tender.pdf"


def test_extract_pages_on_real_cpcl_tender():
    assert REAL_TENDER_PDF.exists(), f"expected fixture at {REAL_TENDER_PDF}"
    data = REAL_TENDER_PDF.read_bytes()
    pages = extract_pages(data)
    assert len(pages) > 0
    assert any(p.text for p in pages), "expected at least one page with extractable text"
    assert pages[0].page == 1


def test_page_aware_text_preserves_page_markers():
    data = REAL_TENDER_PDF.read_bytes()
    pages = extract_pages(data)
    joined = to_page_aware_text(pages, max_chars=5000)
    assert "PAGE 1:" in joined


def test_empty_pdf_raises_clear_error():
    # A structurally valid PDF with a blank page has no extractable text.
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buf = io.BytesIO()
    writer.write(buf)

    with pytest.raises(EmptyPdfTextError):
        extract_pages(buf.getvalue())


def test_page_aware_text_respects_max_chars():
    pages = extract_pages(REAL_TENDER_PDF.read_bytes())
    joined = to_page_aware_text(pages, max_chars=500)
    assert len(joined) <= 550  # small slack for the last partial block's header
