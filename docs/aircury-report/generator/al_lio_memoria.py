# -*- coding: utf-8 -*-
"""
AL-LÍO · Memoria técnica — generador de PDF (plantilla + contenido).

Para escribir en el documento:
  1. Edita CONTENT (portada, índice y `sections`).
  2. Cada sección = { "num", "family", "title", "entradilla", "blocks": [...] }.
     blocks admite:  {"t":"h3","s":"..."}          subtítulo
                     {"t":"p","s":"..."}           párrafo
                     {"t":"ul","items":[...]}       lista
                     {"t":"ol","items":[...]}       lista numerada
                     {"t":"table","head":[...],"rows":[[...],...]}
                     {"t":"note","title":"Nota","s":"..."}
                     {"t":"quote","s":"...","by":"..."}
                     {"t":"code","s":"linea1\\nlinea2"}
                     {"t":"figure","caption":"...","h":150,"path":"optional.png"}
                     {"t":"space","h":10}
  3. Ejecuta:  python al_lio_memoria.py
El texto fluye solo y pagina solo; el índice y los folios se recalculan.

Navegación clicable (para leer y para que una IA salte por el documento):
  · El PDF lleva marcadores/outline: Portada, Índice, cada sección y Cierre.
  · En el índice, cada fila cuyo número ya exista en `sections` es un enlace
    interno que salta a esa página. Al añadir la sección, el enlace se activa
    solo (destino con nombre  p-sec-<num>).
"""
import argparse
import re
import tempfile
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import Color, HexColor
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[2]
REPORT_SOURCE = HERE.parent / "08-technical-report-source.md"

# ───────────────────────────────────────── CONTENT ─────────────────────────────
SECTION_FAMILIES = {
    "01": "Apertura",
    "02": "Apertura",
    "03": "Apertura",
    "04": "Producto y tecnología",
    "05": "Producto y tecnología",
    "06": "Producto y tecnología",
    "07": "Producto y tecnología",
    "08": "Producto y tecnología",
    "09": "Producto y tecnología",
    "10": "Proceso y cierre",
    "11": "Proceso y cierre",
    "12": "Proceso y cierre",
    "13": "Proceso y cierre",
}

TOC_GROUPS = [
    ("Apertura", [
        ("01", "Síntesis ejecutiva"),
        ("02", "Contexto, usuarios y motivación"),
        ("03", "Objetivos, alcance y éxito"),
    ]),
    ("Producto y tecnología", [
        ("04", "Solución y capacidades"),
        ("05", "Diseño y experiencia"),
        ("06", "Diseño técnico"),
        ("07", "Datos, acceso e integraciones"),
        ("08", "Radar y control editorial"),
        ("09", "Seguridad y operación"),
    ]),
    ("Proceso y cierre", [
        ("10", "Desarrollo y calidad"),
        ("11", "Hitos del programa"),
        ("12", "Resultados y sostenibilidad"),
        ("13", "Límites, hoja de ruta y cierre"),
    ]),
]

FIGURE_CATALOG = {
    "VE-01A": {
        "filename": "ve-01a-landing-hero-desktop.png",
        "caption": "Portada pública de AL-LIO y acceso al espacio del estudiante.",
        "h": 250,
    },
    "VE-01B": {
        "filename": "ve-01b-landing-fullpage-desktop.png",
        "caption": "Recorrido público de la propuesta de valor y sus principales áreas.",
        "h": 250,
    },
    "VE-01C": {
        "filename": "ve-01c-auth-entry-desktop.png",
        "caption": "Entrada mediante contraseña o identidad de Google, sin datos personales.",
        "h": 250,
    },
    "VE-02": {
        "filename": "ve-02-onboarding-cycle-selection-desktop.png",
        "caption": "Selección del ciclo y curso académico que establece el contexto de la experiencia.",
        "h": 250,
    },
    "VE-03": {
        "filename": "ve-03-dashboard-personalised-desktop.png",
        "caption": "Panel personalizado con las próximas acciones del estudiante.",
        "h": 250,
    },
    "VE-04": {
        "filename": "ve-04-competencies-cycle-filtered-desktop.png",
        "caption": "Competencias filtradas para el ciclo activo.",
        "h": 250,
    },
    "VE-05": {
        "filename": "ve-05-learning-progress-notes-desktop.png",
        "caption": "Recurso aprobado con progreso y notas ficticias conservadas por el usuario.",
        "h": 250,
    },
    "VE-06": {
        "filename": "ve-06-task-completed-desktop.png",
        "caption": "Tarea ficticia completada para mostrar el ciclo básico de planificación.",
        "h": 250,
    },
    "VE-07": {
        "filename": "ve-07-news-production-limitation-desktop.png",
        "caption": "Estado real de las noticias de producción en la fecha de captura.",
        "h": 250,
    },
    "VE-08": {
        "filename": "ve-08-opportunity-verified-detail-desktop.png",
        "caption": "Oportunidad revisada con fuente y acción disponible para el perfil.",
        "h": 250,
    },
    "VE-09": {
        "filename": "ve-09-profile-cycle-fictional-desktop.png",
        "caption": "Perfil ficticio y ciclo activo que controlan la personalización.",
        "h": 250,
    },
    "VE-10": {
        "filename": "ve-10-dashboard-navigation-mobile.png",
        "caption": "Jerarquía principal de AL-LIO en un viewport móvil responsive.",
        "h": 285,
    },
}

# Eight non-redundant placements are reserved for the review layout. The
# remaining catalogue entries stay available as owner-approved alternatives.
FIGURE_PLACEMENTS = {
    "02": {None: ["VE-01A"]},
    "04": {
        "4.1 Entrada y personalización": ["VE-02"],
        "4.2 Panel y planificación personal": ["VE-03", "VE-06"],
        "4.3 Competencias y aprendizaje": ["VE-05"],
        "4.4 Información y oportunidades": ["VE-08"],
    },
    "05": {None: ["VE-10"]},
    "08": {None: ["VE-07"]},
}

SECTION_INTROS = {
    "03": "Objetivos verificables, alcance deliberado y estado real de la entrega.",
    "04": "Un recorrido privado que conecta entrada, planificación, aprendizaje y oportunidades.",
    "07": "Propiedad de los datos, sesiones protegidas e integraciones encapsuladas.",
    "12": "Resultados comprobados, impacto esperado y continuidad económica y operativa.",
    "13": "Límites explícitos y prioridades que orientan el siguiente año de trabajo.",
}


def clean_markdown_text(value):
    """Convert the approved Markdown prose into plain PDF-safe text."""
    value = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", value)
    value = re.sub(r"<(https?://[^>]+)>", r"\1", value)
    value = value.replace("**", "").replace("`", "")
    for dash in ("—", "–", "‑", "−"):
        value = value.replace(dash, "-")
    return " ".join(value.split())


def table_widths(header):
    key = tuple(header)
    presets = {
        ("Ámbito", "Resultado esperado en la entrega", "Estado a 31 de agosto de 2026"):
            [0.17, 0.39, 0.44],
        ("Componente", "Responsabilidad principal", "Límite relevante"):
            [0.20, 0.36, 0.44],
        ("Periodo", "Hito", "Resultado principal"):
            [0.18, 0.27, 0.55],
        ("Prioridad", "Siguiente resultado", "Criterio de cierre"):
            [0.14, 0.36, 0.50],
    }
    if key in presets:
        return presets[key]
    if len(header) == 2:
        return [0.29, 0.71]
    return [1 / len(header)] * len(header)


def figure_block(evidence_id):
    item = FIGURE_CATALOG[evidence_id]
    return {
        "t": "figure",
        "evidence_id": evidence_id,
        "expected_filename": item["filename"],
        "caption": item["caption"],
        "h": item["h"],
    }


def inject_figures(section):
    placements = FIGURE_PLACEMENTS.get(section["num"], {})
    if not placements:
        return

    rebuilt = []
    pending_ids = []
    for block in section["blocks"]:
        if block["t"] == "h3":
            rebuilt.extend(figure_block(item) for item in pending_ids)
            pending_ids = placements.get(block["s"], [])
        rebuilt.append(block)
    rebuilt.extend(figure_block(item) for item in pending_ids)
    rebuilt.extend(figure_block(item) for item in placements.get(None, []))
    section["blocks"] = rebuilt


def promote_conclusion(section):
    """Give the approved conclusion a deliberate branded continuation page."""
    if section["num"] != "13":
        return
    for index, block in enumerate(section["blocks"]):
        if block["t"] == "h3" and block["s"].endswith("Conclusión"):
            paragraphs = [item["s"] for item in section["blocks"][index + 1:] if item["t"] == "p"]
            section["blocks"] = section["blocks"][:index] + [{
                "t": "conclusion",
                "title": block["s"],
                "paragraphs": paragraphs,
            }]
            return
    raise ValueError("Section 13 must contain its approved conclusion")


def parse_report_sections(source_path):
    """Read only exportable sections 01-13 from the approved editorial source."""
    lines = source_path.read_text(encoding="utf-8").splitlines()
    sections = []
    current = None
    active = False
    index = 0

    while index < len(lines):
        raw = lines[index]
        stripped = raw.strip()

        if stripped == "# Texto exportable":
            active = True
            index += 1
            continue
        if active and stripped.startswith("# Mapa interno de figuras"):
            break
        if not active:
            index += 1
            continue
        if stripped.startswith("> **NOTA INTERNA"):
            index += 1
            while index < len(lines) and (lines[index].lstrip().startswith(">") or not lines[index].strip()):
                index += 1
            continue

        section_match = re.match(r"^## (\d+)\.\s+(.+)$", stripped)
        if section_match:
            num = section_match.group(1).zfill(2)
            current = {
                "num": num,
                "family": SECTION_FAMILIES[num],
                "title": clean_markdown_text(section_match.group(2)),
                "entradilla": SECTION_INTROS.get(num, ""),
                "blocks": [],
            }
            sections.append(current)
            index += 1
            continue

        if stripped.startswith("## "):
            current = None
            index += 1
            continue
        if current is None or not stripped or stripped == "---":
            index += 1
            continue

        if stripped.startswith("### "):
            current["blocks"].append({"t": "h3", "s": clean_markdown_text(stripped[4:])})
            index += 1
            continue

        if stripped.startswith("|"):
            table_lines = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                table_lines.append(lines[index].strip())
                index += 1

            def cells(line):
                return [clean_markdown_text(cell.strip()) for cell in line.strip("|").split("|")]

            header = cells(table_lines[0])
            rows = [cells(line) for line in table_lines[2:]]
            current["blocks"].append({
                "t": "table",
                "head": header,
                "rows": rows,
                "widths": table_widths(header),
            })
            continue

        list_match = re.match(r"^(-|\d+\.)\s+(.+)$", stripped)
        if list_match:
            ordered = list_match.group(1) != "-"
            items = []
            while index < len(lines):
                candidate = lines[index]
                match = re.match(r"^\s*(-|\d+\.)\s+(.+)$", candidate)
                if not match or (match.group(1) != "-") != ordered:
                    break
                item = match.group(2).strip()
                index += 1
                while index < len(lines):
                    continuation = lines[index]
                    if not continuation.strip() or re.match(r"^\s*(-|\d+\.)\s+", continuation):
                        break
                    if continuation.startswith(" ") and not continuation.lstrip().startswith(("#", "|", ">")):
                        item += " " + continuation.strip()
                        index += 1
                    else:
                        break
                items.append(clean_markdown_text(item))
                if index < len(lines) and not lines[index].strip():
                    break
            current["blocks"].append({"t": "ol" if ordered else "ul", "items": items})
            continue

        paragraph_lines = [stripped]
        index += 1
        while index < len(lines):
            candidate = lines[index]
            candidate_stripped = candidate.strip()
            if (not candidate_stripped or candidate_stripped.startswith(("#", ">", "|")) or
                    re.match(r"^(-|\d+\.)\s+", candidate_stripped)):
                break
            paragraph_lines.append(candidate_stripped)
            index += 1
        current["blocks"].append({"t": "p", "s": clean_markdown_text(" ".join(paragraph_lines))})

    if [section["num"] for section in sections] != [f"{number:02d}" for number in range(1, 14)]:
        raise ValueError("The approved report source must contain sections 01 through 13 in order")

    for section in sections:
        if not section["entradilla"] and section["blocks"] and section["blocks"][0]["t"] == "p":
            section["entradilla"] = section["blocks"].pop(0)["s"]
        inject_figures(section)
        promote_conclusion(section)
    return sections


CONTENT = {
    "cover": {
        "kicker": "Aircury Summer of Code 2026",
        "title": ["AL-LIO", "Memoria técnica"],
        "subtitle": "Versión técnica para revisión",
        "intro": ("Espacio digital privado para estudiantes de Formación Profesional: "
                  "planificación, aprendizaje e información revisada según el ciclo."),
        "meta": [
            ("Autor", "Daniel García Ortega", None),
            ("Fecha", "31 de agosto de 2026", None),
            ("Versión", "aircury-2026-delivery", None),
            ("Repositorio", "github.com/danielgarciaortega-dev/al-lio",
             "https://github.com/danielgarciaortega-dev/al-lio"),
            ("Web", "al-lio.app", "https://al-lio.app"),
        ],
    },
    "toc": {"groups": TOC_GROUPS},
    "sections": parse_report_sections(REPORT_SOURCE),
    "closing": {
        "kicker": "Aircury Summer of Code 2026",
        "title": "Organiza, aprende y avanza",
        "intro": ("AL-LIO ha sido desarrollado en el marco de Aircury Summer of Code "
                  "2026. Gracias a Aircury SL por impulsar iniciativas tecnológicas "
                  "con impacto social, vocación abierta y continuidad."),
        "meta": [
            ("Autor", "Daniel García Ortega", None),
            ("Fecha", "31 de agosto de 2026", None),
            ("Contacto", "hola@al-lio.app", None),
            ("Repositorio", "github.com/danielgarciaortega-dev/al-lio",
             "https://github.com/danielgarciaortega-dev/al-lio"),
            ("Web", "al-lio.app", "https://al-lio.app"),
        ],
    },
    "output": str(REPO_ROOT / "output" / "pdf" /
                  "AL_LIO_Memoria_Tecnica_REVISION.pdf"),
}

# ───────────────────────────────────────── STYLE ──────────────────────────────
FF = lambda p: str(HERE / "fonts" / p)
pdfmetrics.registerFont(TTFont("Barlow", FF("Barlow-ExtraBold.ttf")))
pdfmetrics.registerFont(TTFont("Inter", FF("Inter-400.ttf")))
pdfmetrics.registerFont(TTFont("Inter-M", FF("Inter-500.ttf")))
pdfmetrics.registerFont(TTFont("Inter-SB", FF("Inter-600.ttf")))
pdfmetrics.registerFont(TTFont("Inter-B", FF("Inter-700.ttf")))
pdfmetrics.registerFont(TTFont("Mono", FF("Inter-400.ttf")))  # fallback mono

W, H = A4
CREAM  = HexColor("#F7F3EC"); INK   = HexColor("#2F2A24"); GREEN = HexColor("#1F5B46")
BODY   = HexColor("#4D4842"); MUTED = HexColor("#7A736B"); FAINT = HexColor("#9A9589")
HAIR   = HexColor("#E6DED2"); LEADER = HexColor("#DAD2C3"); PANEL = HexColor("#EFEAE0")

ML, MR, MT, MB = 58, 58, 62, 56
CW = W - ML - MR
RX = W - MR
TOP = H - MT
BOT = MB + 22          # lowest body baseline before a page break
BODYTRACK = -0.2


class Doc:
    def __init__(self, path, page_map=None, total_pages=None):
        self.c = canvas.Canvas(str(path), pagesize=A4)
        self.c.setTitle("AL-LÍO · Memoria técnica")
        self.c.setAuthor("Daniel García Ortega")
        self.page = 0
        self.section = "Memoria técnica"
        self.y = TOP
        self.page_map = page_map or {}
        self.total_pages = total_pages
        self.destinations = {}

    # -- text --
    def _track(self, font, track):
        if track is None:
            return BODYTRACK if font.startswith("Inter") else 0.0
        return track

    def text(self, x, y, s, font="Inter", size=10, color=BODY, track=None):
        tr = self._track(font, track)
        to = self.c.beginText(); to.setTextOrigin(x, y)
        to.setFont(font, size); to.setFillColor(color)
        if tr:
            to.setCharSpace(tr)
        to.textOut(s); self.c.drawText(to)

    def sw(self, s, font, size, track=None):
        tr = self._track(font, track)
        return self.c.stringWidth(s, font, size) + tr * max(len(s) - 1, 0)

    def rtext(self, x, y, s, font="Inter", size=10, color=BODY, track=None):
        self.text(x - self.sw(s, font, size, track), y, s, font, size, color, track)

    def ctext(self, xc, y, s, font="Inter", size=10, color=BODY, track=None):
        self.text(xc - self.sw(s, font, size, track) / 2, y, s, font, size, color, track)

    def rule(self, x1, y, x2, color=HAIR, wt=0.6):
        self.c.setStrokeColor(color); self.c.setLineWidth(wt); self.c.line(x1, y, x2, y)

    def eyebrow(self, x, y, s, color=GREEN, size=8.0):
        self.text(x, y, s.upper(), "Inter-B", size, color, track=1.9)

    def link(self, x, y, s, url, font="Inter", size=9.2):
        w = self.sw(s, font, size)
        self.text(x, y, s, font, size, GREEN)
        self.c.linkURL(url, (x, y - 2, x + w, y + size), relative=0, thickness=0)

    def wrap(self, s, width, font, size, track=None):
        out, line = [], ""
        for word in s.split(" "):
            trial = word if not line else line + " " + word
            if self.sw(trial, font, size, track) <= width:
                line = trial
            else:
                out.append(line); line = word
        if line:
            out.append(line)
        return out

    # -- page furniture --
    def _bg(self):
        c = self.c
        c.setFillColor(CREAM); c.rect(0, 0, W, H, fill=1, stroke=0)
        c.setFillColor(Color(0, 0, 0, 0.022))
        step = 26; yy = step
        while yy < H:
            xx = step
            while xx < W:
                c.circle(xx, yy, 0.5, fill=1, stroke=0); xx += step
            yy += step
        c.setFillColor(GREEN); c.rect(0, H - 3, W, 3, fill=1, stroke=0)

    def _faint_symbol(self):
        sw = 244
        self.c.drawImage(str(HERE / "symbol_faint.png"), W - sw + 66, -44,
                         width=sw, height=sw * (185 / 197), mask="auto",
                         preserveAspectRatio=True)

    def _wordmark(self, x, y_top, w=104):
        h = w * (96 / 354)
        self.c.drawImage(str(HERE / "wordmark.png"), x, y_top - h,
                         width=w, height=h, mask="auto", preserveAspectRatio=True)

    def _running_head(self):
        self.eyebrow(ML, TOP, "AL·LÍO - Memoria técnica", FAINT, 7.6)
        section_label = self.section.upper()
        while self.sw(section_label, "Inter-B", 7.6, track=1.4) > 220 and len(section_label) > 8:
            section_label = section_label[:-1]
        if section_label != self.section.upper():
            section_label = section_label.rstrip() + "..."
        self.rtext(RX, TOP, section_label, "Inter-B", 7.6, FAINT, track=1.4)
        self.rule(ML, TOP - 8, RX)

    def _folio(self):
        y = MB - 2
        self.rule(ML, y + 12, RX)
        total = f"{self.total_pages:02d}" if self.total_pages else "--"
        tail = f"  /  {total}"
        self.rtext(RX, y, tail, "Inter", 7.4, FAINT)
        self.rtext(RX - self.c.stringWidth(tail, "Inter", 7.4), y,
                   f"{self.page:02d}", "Inter-B", 7.4, MUTED)

    def anchor(self, key, title, level=0):
        """Register the current page as a named destination + outline entry."""
        self.destinations[key] = self.page
        self.c.bookmarkPage(key, fit="XYZ", top=H, left=0, zoom=0)
        self.c.addOutlineEntry(title, key, level=level)

    def new_page(self, kind="body"):
        if self.page:
            self.c.showPage()
        self.page += 1
        self._bg()
        if kind == "body":
            self._running_head()
            self._folio()
            self.y = TOP - 46
        return self.y

    def _colophon(self, meta):
        step, y_bottom = 13.5, MB + 4
        y = y_bottom + step * (len(meta) - 1)
        self.rule(ML, y + 20, ML + 300)
        for label, value, url in meta:
            self.eyebrow(ML, y, label, GREEN, 6.8)
            if url:
                self.link(ML + 78, y, value, url, "Inter", 9.2)
            else:
                self.text(ML + 78, y, value, "Inter", 9.2, INK)
            y -= step

    # -- big pages --
    def cover(self, cv):
        self.new_page(kind="plain")
        self.anchor("p-cover", "Portada")
        self._faint_symbol()
        self._wordmark(ML, TOP + 12)
        ty = TOP - 150
        self.eyebrow(ML, ty, cv["kicker"], GREEN, 8.2)
        yy = ty - 60
        for line in cv["title"]:
            self.text(ML, yy, line, "Barlow", 52, INK, track=-1.2); yy -= 56
        self.rule(ML, yy + 20, ML + 300, HAIR, 0.8)
        self.text(ML, yy - 2, cv["subtitle"], "Inter-M", 12, MUTED)
        y2 = yy - 30
        for line in self.wrap(cv["intro"], 344, "Inter", 9.8):
            self.text(ML, y2, line, "Inter", 9.8, BODY); y2 -= 15
        self._colophon(cv["meta"])

    def closing(self, cl):
        self.new_page(kind="plain")
        self.anchor("p-closing", "Cierre")
        self._faint_symbol()
        self._wordmark(ML, TOP + 12)
        ty = 430
        self.eyebrow(ML, ty, cl["kicker"], GREEN, 8.2)
        self.text(ML, ty - 48, cl["title"], "Barlow", 33, INK, track=-0.9)
        self.rule(ML, ty - 64, ML + 300, HAIR, 0.8)
        y2 = ty - 84
        for line in self.wrap(cl["intro"], 344, "Inter", 9.6):
            self.text(ML, y2, line, "Inter", 9.6, BODY); y2 -= 14.5
        self._colophon(cl["meta"])

    def toc(self, toc):
        self.section = "Índice"
        self.new_page(kind="plain")
        self.anchor("p-toc", "Índice")
        self._running_head()
        self._folio()
        hy = TOP - 58
        self.text(ML, hy, "Índice", "Barlow", 30, INK, track=-0.8)
        self.rule(ML, hy - 18, RX, HAIR, 0.8)

        have = {s["num"] for s in CONTENT["sections"]}
        NUM_R, TITLE_X, ROW = ML + 20, ML + 34, 26
        y = hy - 46
        for gi, (gtitle, items) in enumerate(toc["groups"]):
            if gi:
                y -= 22
            self.rule(ML, y + 9, ML + 20, GREEN, 1.4)
            self.eyebrow(ML, y - 4, gtitle, GREEN, 8.0)
            y -= 27
            for num, title in items:
                page = self.page_map.get(f"p-sec-{num}")
                page_label = f"{page:02d}" if page else "--"
                self.rtext(NUM_R, y, num, "Inter-SB", 8.6, GREEN)
                self.text(TITLE_X, y, title, "Inter", 9.6, INK)
                lx1 = TITLE_X + self.sw(title, "Inter", 9.6) + 7
                lx2 = RX - self.c.stringWidth(page_label, "Inter-SB", 8.6) - 7
                if lx2 - lx1 > 10:
                    self.c.setStrokeColor(LEADER); self.c.setLineWidth(0.5)
                    self.c.setDash(0.5, 3.4)
                    self.c.line(lx1, y + 1.5, lx2, y + 1.5); self.c.setDash()
                self.rtext(RX, y, page_label, "Inter-SB", 8.6, MUTED)
                if num in have:
                    self.c.linkRect("", f"p-sec-{num}", (ML, y - 7, RX, y + 12),
                                    relative=0, thickness=0)
                y -= ROW

    def section_header(self, sec):
        """Compact section start at the top of a fresh page; content flows after."""
        self.section = f"{sec['num']} · {sec['family']}"
        self.new_page(kind="body")
        self.anchor(f"p-sec-{sec['num']}", f"{sec['num']} · {sec['title']}")
        self.y = TOP - 42
        self.text(ML, self.y, sec["num"], "Barlow", 30, GREEN, track=-1)
        self.y -= 34
        title_lines = self.wrap(sec["title"], CW, "Barlow", 18, track=-0.4)
        for title_line in title_lines:
            self.text(ML, self.y, title_line, "Barlow", 18, INK, track=-0.4)
            self.y -= 21
        self.y -= 1
        if sec.get("entradilla"):
            for line in self.wrap(sec["entradilla"], CW, "Inter", 9.6):
                self.text(ML, self.y, line, "Inter", 9.6, MUTED)
                self.y -= 14.5
        self.y -= 2
        self.rule(ML, self.y + 6, ML + 40, GREEN, 1.6)
        self.y -= 20

    # -- flowing body blocks --
    def _need(self, h):
        if self.y - h < BOT:
            self.new_page(kind="body")

    def blk_h3(self, s):
        display = re.sub(r"^(\d+\.\d+)\s+", r"\1 · ", s)
        lines = self.wrap(display, CW - 14, "Barlow", 13.5, track=-0.2)
        height = len(lines) * 17 + 25
        self._need(height)
        self.y -= 8
        top = self.y + 9.5
        self.c.setStrokeColor(GREEN); self.c.setLineWidth(3)
        for line in lines:
            self.text(ML + 12, self.y, line, "Barlow", 13.5, INK, track=-0.2)
            self.y -= 17
        self.c.line(ML, self.y + 13, ML, top)
        self.y -= 5

    def blk_p(self, s, size=10, lead=15.5, color=BODY, x=ML, width=CW):
        for line in self.wrap(s, width, "Inter", size):
            self._need(lead)
            self.text(x, self.y, line, "Inter", size, color)
            self.y -= lead
        self.y -= 4

    def blk_ul(self, items, ordered=False):
        for i, it in enumerate(items):
            lines = self.wrap(it, CW - 16, "Inter", 10)
            self._need(len(lines) * 15.5 + 2)
            if ordered:
                self.text(ML, self.y, f"{i+1}.", "Inter-SB", 9, GREEN)
            else:
                self.c.setFillColor(GREEN)
                self.c.circle(ML + 2.5, self.y + 3, 1.5, fill=1, stroke=0)
            for j, line in enumerate(lines):
                self.text(ML + 14, self.y, line, "Inter", 10, BODY)
                self.y -= 15.5
            self.y -= 2
        self.y -= 4

    def blk_table(self, head, rows, widths=None):
        column_count = len(head) if head else len(rows[0])
        widths = widths or [1 / column_count] * column_count
        if len(widths) != column_count or abs(sum(widths) - 1) > 0.001:
            raise ValueError("Table widths must match the column count and sum to one")
        if any(len(row) != column_count for row in rows):
            raise ValueError("Every table row must match the table column count")

        column_widths = [CW * fraction for fraction in widths]
        column_x = [ML]
        for width in column_widths[:-1]:
            column_x.append(column_x[-1] + width)

        def prepare(values, font, size, lead, vertical_padding):
            prepared = [
                self.wrap(value, column_widths[index] - 12, font, size)
                for index, value in enumerate(values)
            ]
            return prepared, max(len(lines) for lines in prepared) * lead + vertical_padding

        prepared_rows = [prepare(row, "Inter", 8.8, 12.5, 7) for row in rows]
        prepared_header = prepare(head, "Inter-SB", 8.0, 11.5, 9) if head else ([], 0)

        def draw_cells(prepared, font, size, lead, color, y):
            for column_index, lines in enumerate(prepared):
                line_y = y
                for line in lines:
                    self.text(column_x[column_index] + 5, line_y, line, font, size, color)
                    line_y -= lead

        def draw_header():
            if not head:
                return
            prepared, header_height = prepared_header
            top = self.y + 9
            self.c.setFillColor(PANEL)
            self.c.rect(ML, top - header_height, CW, header_height, fill=1, stroke=0)
            draw_cells(prepared, "Inter-SB", 8.0, 11.5, GREEN, self.y)
            self.y = top - header_height - 2
            self.rule(ML, self.y + 1, RX, HAIR, 0.6)

        first_row_height = prepared_rows[0][1] if prepared_rows else 17
        self._need(prepared_header[1] + first_row_height + 16)
        draw_header()
        for row_index, (prepared, row_height) in enumerate(prepared_rows):
            if self.y - row_height < BOT:
                self.new_page(kind="body")
                draw_header()
            top = self.y + 6
            if row_index % 2:
                self.c.setFillColor(Color(0.94, 0.92, 0.88, 0.42))
                self.c.rect(ML, top - row_height, CW, row_height, fill=1, stroke=0)
            draw_cells(prepared, "Inter", 8.8, 12.5, BODY, self.y)
            self.y = top - row_height
            self.rule(ML, self.y + 1, RX, HAIR, 0.45)
        self.y -= 9

    def blk_note(self, title, s):
        lines = self.wrap(s, CW - 16, "Inter", 9.4)
        h = 18 + len(lines) * 14.5
        self._need(h + 10)
        top = self.y + 10
        self.text(ML + 13, self.y, title, "Inter-B", 8.2, GREEN, track=0.8)
        self.y -= 15
        for line in lines:
            self.text(ML + 13, self.y, line, "Inter", 9.4, BODY)
            self.y -= 14.5
        self.c.setStrokeColor(GREEN); self.c.setLineWidth(2)
        self.c.line(ML, self.y + 10, ML, top)
        self.y -= 6

    def blk_quote(self, s, by=None):
        lines = self.wrap(s, CW - 20, "Inter-M", 11)
        self._need(len(lines) * 17 + (16 if by else 4))
        top = self.y + 6
        for line in lines:
            self.text(ML + 16, self.y, line, "Inter-M", 11, INK)
            self.y -= 17
        if by:
            self.text(ML + 16, self.y, f"- {by}", "Inter", 8.6, MUTED)
            self.y -= 14
        self.c.setStrokeColor(GREEN); self.c.setLineWidth(2)
        self.c.line(ML, self.y + 12, ML, top)
        self.y -= 6

    def blk_code(self, s):
        rows = s.split("\n")
        pad = 11
        h = pad * 2 + (len(rows) - 1) * 12.5 + 8
        self._need(h + 8)
        top = self.y + 6
        self.c.setFillColor(PANEL)
        self.c.rect(ML, top - h, CW, h, fill=1, stroke=0)
        yy = top - pad - 6
        for row in rows:
            self.text(ML + 13, yy, row, "Inter", 8.6, INK, track=0)
            yy -= 12.5
        self.y = top - h - 6

    def blk_figure(self, caption, h=138, path=None):
        caption_lines = self.wrap(caption, CW, "Inter-SB", 8, track=0.4)
        caption_h = max(14, len(caption_lines) * 12)
        max_image_h = min(h, TOP - 46 - BOT - caption_h - 12)
        if max_image_h <= 0:
            raise ValueError("Figure height leaves no room for its caption")

        image = None
        draw_w, draw_h = CW, max_image_h
        if path:
            image_path = Path(path)
            if not image_path.is_absolute():
                image_path = HERE / image_path
            image_path = image_path.resolve()
            if not image_path.is_file():
                raise FileNotFoundError(f"Figure image not found: {image_path}")
            image = ImageReader(str(image_path))
            source_w, source_h = image.getSize()
            scale = min(CW / source_w, max_image_h / source_h)
            draw_w, draw_h = source_w * scale, source_h * scale

        self._need(draw_h + caption_h + 12)
        figure_x = ML + (CW - draw_w) / 2
        figure_y = self.y - draw_h
        self.c.setFillColor(CREAM); self.c.setStrokeColor(HAIR); self.c.setLineWidth(0.8)
        self.c.rect(figure_x, figure_y, draw_w, draw_h, fill=1, stroke=1)
        if image:
            self.c.drawImage(image, figure_x, figure_y, width=draw_w, height=draw_h,
                             mask="auto", preserveAspectRatio=True, anchor="c")
        else:
            self.c.setFillColor(PANEL)
            self.c.rect(figure_x, figure_y, draw_w, draw_h, fill=1, stroke=0)
            self.ctext(W / 2, figure_y + draw_h / 2 - 3, "EVIDENCIA VISUAL", "Inter-B",
                       7.6, FAINT, track=1.9)
        self.y = figure_y - 14
        for line in caption_lines:
            self.text(ML, self.y, line, "Inter-SB", 8, MUTED, track=0.4)
            self.y -= 12
        self.y -= 2

    def blk_conclusion(self, title, paragraphs):
        self.new_page(kind="body")
        self._faint_symbol()
        self.y = TOP - 76
        display = re.sub(r"^(\d+\.\d+)\s+", r"\1 · ", title)
        self.text(ML, self.y, display, "Barlow", 24, INK, track=-0.5)
        self.y -= 30
        self.rule(ML, self.y + 8, ML + 54, GREEN, 1.8)
        self.y -= 18
        for index, paragraph in enumerate(paragraphs):
            self.blk_p(
                paragraph,
                size=11.2 if index == 0 else 10.2,
                lead=17.2 if index == 0 else 15.8,
                color=INK if index == 0 else BODY,
                width=390,
            )
            self.y -= 4

    def section_body(self, sec):
        self.section_header(sec)
        for b in sec["blocks"]:
            t = b["t"]
            if t == "h3":       self.blk_h3(b["s"])
            elif t == "p":      self.blk_p(b["s"])
            elif t == "ul":     self.blk_ul(b["items"])
            elif t == "ol":     self.blk_ul(b["items"], ordered=True)
            elif t == "table":  self.blk_table(b.get("head"), b["rows"], b.get("widths"))
            elif t == "note":   self.blk_note(b.get("title", "Nota"), b["s"])
            elif t == "quote":  self.blk_quote(b["s"], b.get("by"))
            elif t == "code":   self.blk_code(b["s"])
            elif t == "figure": self.blk_figure(b.get("caption", "Figura"), b.get("h", 150),
                                                 b.get("path"))
            elif t == "conclusion": self.blk_conclusion(b["title"], b["paragraphs"])
            elif t == "space":  self.y -= b.get("h", 10)

    def build(self):
        self.cover(CONTENT["cover"])
        self.toc(CONTENT["toc"])
        for sec in CONTENT["sections"]:
            self.section_body(sec)
        self.closing(CONTENT["closing"])
        self.c.showPage()
        self.c.showOutline()
        self.c.save()
        return {"destinations": dict(self.destinations), "total_pages": self.page}


def validate_content(content):
    section_nums = [section["num"] for section in content["sections"]]
    if len(section_nums) != len(set(section_nums)):
        raise ValueError("Section numbers must be unique")
    expected_nums = [f"{number:02d}" for number in range(1, 14)]
    if section_nums != expected_nums:
        raise ValueError("The report must contain sections 01 through 13 in order")

    toc_nums = [num for _, items in content["toc"]["groups"] for num, _ in items]
    if len(toc_nums) != len(set(toc_nums)):
        raise ValueError("Table-of-contents numbers must be unique")
    if toc_nums != section_nums:
        raise ValueError("Table-of-contents numbers must match the report sections in order")

    figures = [
        block
        for section in content["sections"]
        for block in section["blocks"]
        if block["t"] == "figure"
    ]
    evidence_ids = [figure.get("evidence_id") for figure in figures]
    if len(evidence_ids) != 8 or len(evidence_ids) != len(set(evidence_ids)):
        raise ValueError("The review report must reserve eight unique visual-evidence slots")
    for figure in figures:
        evidence_id = figure["evidence_id"]
        expected = FIGURE_CATALOG.get(evidence_id)
        if not expected or figure.get("expected_filename") != expected["filename"]:
            raise ValueError(f"Figure metadata does not match the #301 catalogue: {evidence_id}")
        if figure.get("path"):
            raise ValueError("Issue #323 must not insert unapproved screenshot candidates")

    serialized = repr(content)
    for forbidden in ("NOTA INTERNA", "NO EXPORTAR AL PDF", "gmail.com"):
        if forbidden in serialized:
            raise ValueError(f"Non-exportable or private content leaked into CONTENT: {forbidden}")


def generate_pdf(output_path):
    validate_content(CONTENT)
    output_path = Path(output_path).expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temp_root = REPO_ROOT / "tmp" / "pdfs"
    temp_root.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="al-lio-report-", dir=temp_root) as tmp:
        first_pass_path = Path(tmp) / "pagination-pass.pdf"
        first_pass = Doc(first_pass_path).build()
        final_pass = Doc(output_path, first_pass["destinations"],
                         first_pass["total_pages"]).build()

    if first_pass != final_pass:
        raise RuntimeError("Report pagination changed between generation passes")
    return final_pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate the AL-LIO technical report PDF")
    parser.add_argument("--output", default=CONTENT["output"], help="Generated PDF path")
    args = parser.parse_args()
    output_path = Path(args.output).expanduser().resolve()
    result = generate_pdf(output_path)
    print("WROTE", output_path, output_path.stat().st_size, "bytes",
          f"({result['total_pages']} pages)")
