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
`output/pdf/AL_LIO_Memoria_Tecnica_PLANTILLA.pdf`. An alternative path can be
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
  output/pdf/AL_LIO_Memoria_Tecnica_PLANTILLA.pdf
```

## Editing contract

- Edit `CONTENT` for the cover, table of contents, sections and closing page.
- Keep each section number unique and include every report section in the table of
  contents.
- Do not maintain visible page numbers or the final page total manually. The
  generator resolves them with a two-pass build.
- A figure block without `path` remains an empty placeholder.
- A figure block with `path` loads a local image relative to this directory unless
  an absolute path is supplied. Images are scaled proportionally and never cropped.

Example:

```python
{
    "t": "figure",
    "path": "screenshots/dashboard.png",
    "caption": "Figure 1 - Student dashboard with fictional demonstration data",
    "h": 220,
}
```

Product screenshots remain owned by issue #301 and must use fictional data. Report
drafting remains owned by issue #302, and final PDF verification remains owned by
issue #303.

The bundled Barlow and Inter font files retain their original SIL Open Font
License 1.1 notices in the `fonts/` directory.
