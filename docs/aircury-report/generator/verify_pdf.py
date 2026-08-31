"""Structural checks for a generated AL-LIO technical report PDF."""

import argparse
import re
from collections import Counter
from pathlib import Path

from pypdf import PdfReader

from al_lio_memoria import CONTENT


def flatten_outline(items):
    for item in items:
        if isinstance(item, list):
            yield from flatten_outline(item)
        else:
            yield item


def annotations(reader):
    for page_number, page in enumerate(reader.pages, start=1):
        for reference in page.get("/Annots") or []:
            yield page_number, reference.get_object()


def verify(pdf_path):
    reader = PdfReader(str(pdf_path))
    total_pages = len(reader.pages)
    outline = {
        item.title: reader.get_destination_page_number(item) + 1
        for item in flatten_outline(reader.outline)
    }

    expected_sections = {
        f"{section['num']} · {section['title']}": section
        for section in CONTENT["sections"]
    }
    toc_titles = {
        num: title
        for _, items in CONTENT["toc"]["groups"]
        for num, title in items
    }
    required_outline = {"Portada", "Índice", "Cierre", *expected_sections}
    missing_outline = required_outline - set(outline)
    if missing_outline:
        raise AssertionError(f"Missing outline entries: {sorted(missing_outline)}")

    toc_page = outline["Índice"]
    toc_lines = [
        line.strip()
        for line in (reader.pages[toc_page - 1].extract_text() or "").splitlines()
        if line.strip()
    ]
    section_pages = []
    for outline_title, section in expected_sections.items():
        page_number = outline[outline_title]
        section_pages.append(page_number)
        toc_title = toc_titles[section["num"]]
        title_index = toc_lines.index(toc_title)
        actual_row = toc_lines[title_index - 1:title_index + 2]
        expected_row = [section["num"], toc_title, f"{page_number:02d}"]
        if actual_row != expected_row:
            raise AssertionError(
                f"Incorrect table-of-contents row for {section['num']}: "
                f"expected {expected_row}, found {actual_row}"
            )

    closing_page = outline["Cierre"]
    expected_total = f"/  {total_pages:02d}"
    for page_number in range(toc_page, closing_page):
        page_text = reader.pages[page_number - 1].extract_text() or ""
        if expected_total not in page_text:
            raise AssertionError(
                f"Page {page_number} does not display the final total {total_pages:02d}"
            )

    external_links = []
    internal_destinations = []
    for _, annotation in annotations(reader):
        action = annotation.get("/A") or {}
        if action.get("/S") == "/URI":
            external_links.append(action.get("/URI"))
        destination = annotation.get("/Dest")
        if destination:
            internal_destinations.append(
                reader.get_page_number(destination[0].get_object()) + 1
            )

    expected_external_links = Counter(
        {
            "https://github.com/danielgarciaortega-dev/al-lio": 2,
            "https://al-lio.app": 2,
        }
    )
    if Counter(external_links) != expected_external_links:
        raise AssertionError(f"Unexpected external links: {external_links}")
    if Counter(internal_destinations) != Counter(section_pages):
        raise AssertionError(
            "Internal table-of-contents destinations do not match section pages"
        )

    full_text = " ".join(
        " ".join((page.extract_text() or "").split())
        for page in reader.pages
    )
    required_fragments = [
        "345 pruebas",
        "31 de agosto de 2027",
        "aplicación no verificada",
        "no se había realizado un estudio formal",
        "Aircury SL",
    ]
    missing_fragments = [item for item in required_fragments if item not in full_text]
    if missing_fragments:
        raise AssertionError(f"Required report statements are missing: {missing_fragments}")

    if full_text.count("EVIDENCIA VISUAL") != 8:
        raise AssertionError("The review PDF must contain eight visual-evidence placeholders")
    forbidden_fragments = ["NOTA INTERNA", "NO EXPORTAR AL PDF", "gmail.com"]
    leaked_fragments = [item for item in forbidden_fragments if item in full_text]
    if leaked_fragments:
        raise AssertionError(f"Non-exportable content leaked into the PDF: {leaked_fragments}")
    if re.search(r"\b(?:DEL|VER|PRD|DAT|ARC|SEC|GOV|ENG|QAL|OPS|IMP|ECO|VIS|VE)-\d{2,3}[A-C]?\b", full_text):
        raise AssertionError("Internal evidence identifiers must not be rendered in the PDF")

    return {
        "pages": total_pages,
        "outline_entries": len(outline),
        "internal_links": len(internal_destinations),
        "external_links": len(external_links),
        "figure_placeholders": full_text.count("EVIDENCIA VISUAL"),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    args = parser.parse_args()
    result = verify(args.pdf.resolve())
    print("VERIFIED", args.pdf.resolve(), result)
