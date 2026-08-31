# AL-LIO technical report generator

This directory contains the canonical generator for the Aircury technical report.
The generated PDF is the delivery artifact; a parallel Word source is intentionally
not maintained.

## Generate the review PDF

From the repository root:

```powershell
python docs/aircury-report/generator/al_lio_memoria.py
```

The default output is written to
`output/pdf/AL_LIO_Memoria_Tecnica_FINAL.pdf`. An alternative path can be
provided with `--output`.

```powershell
python docs/aircury-report/generator/al_lio_memoria.py `
  --output C:\path\to\AL_LIO_Memoria_Tecnica.pdf
```

Install the pinned Python dependencies before generating the document:

```powershell
python -m pip install -r docs/aircury-report/generator/requirements.txt
```

Run the structural checks after generation:

```powershell
python docs/aircury-report/generator/verify_pdf.py `
  output/pdf/AL_LIO_Memoria_Tecnica_FINAL.pdf
```

## Editing contract

- Edit `08-technical-report-source.md` for approved report prose. The generator
  imports only the exportable sections and excludes every internal evidence note.
- Edit `CONTENT` for cover metadata, the concise table of contents, the closing
  page and layout-level configuration.
- Keep each section number unique and include every report section in the table of
  contents.
- Do not maintain visible page numbers or the final page total manually. The
  generator resolves them with a two-pass build.
- Screenshot figures load only the four owner-approved files catalogued by #301.
  Images are scaled proportionally and never cropped.
- The final layout includes two compact vector diagrams drawn directly by the
  generator: the system trust boundaries and the Radar editorial pipeline.
- Issue #303 validates that no placeholder or unapproved screenshot reaches the
  final PDF.
- The approved section 11 chronology is rendered automatically as an editorial
  timeline. Other Markdown tables use padded, paginated rows and repeat their
  header after a page break.

Example:

```python
{
    "t": "figure",
    "path": "screenshots/dashboard.png",
    "caption": "Figure 1 - Student dashboard with fictional demonstration data",
    "h": 220,
}
```

Product screenshots remain owned by issue #301 and use fictional data where the
account state is visible. Report drafting remains owned by issue #302, and final
PDF verification remains owned by issue #303.

The bundled Barlow and Inter font files retain their original SIL Open Font
License 1.1 notices in the `fonts/` directory.
