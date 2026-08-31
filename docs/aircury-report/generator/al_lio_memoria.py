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

# ───────────────────────────────────────── CONTENT ─────────────────────────────
CONTENT = {
    "cover": {
        "kicker": "Aircury Summer of Code 2026",
        "title": ["Memoria", "técnica"],
        "subtitle": "Documentación técnica final",
        "intro": ("Plantilla de maquetación: portada, índice, apertura de sección, "
                  "página de contenido y cierre. El contenido validado se incorpora "
                  "en la fase siguiente."),
        "meta": [
            ("Autor", "Daniel García Ortega", None),
            ("Fecha", "Agosto 2026", None),
            ("Repositorio", "github.com/danielgarciaortega-dev/al-lio",
             "https://github.com/danielgarciaortega-dev/al-lio"),
            ("Web", "al-lio.app", "https://al-lio.app"),
        ],
    },
    "toc": {
        "groups": [
            ("Apertura", [
                ("01", "Resumen ejecutivo"),
                ("02", "Contexto, problema y usuarios objetivo"),
                ("03", "Objetivos, alcance y criterios de éxito"),
            ]),
            ("Producto y tecnología", [
                ("04", "Producto y funcionalidades desarrolladas"),
                ("05", "Diseño y experiencia de usuario"),
                ("06", "Arquitectura técnica"),
                ("07", "Modelo de datos, autenticación e integraciones"),
                ("08", "AL·LÍO Radar — subsistema de contenidos"),
                ("09", "Seguridad, infraestructura y despliegue"),
            ]),
            ("Proceso y cierre", [
                ("10", "Metodología, pruebas y control de calidad"),
                ("11", "Hitos y cronología del programa"),
                ("12", "Resultados y cumplimiento del programa"),
                ("13", "Limitaciones, roadmap y conclusiones"),
            ]),
        ],
    },
    "sections": [
        {
            "num": "04",
            "family": "Producto y tecnología",
            "title": "Título de la sección",
            "entradilla": ("Entradilla de una o dos líneas que resume el propósito "
                           "de la sección. Se redacta en la fase de contenido."),
            "blocks": [
                {"t": "h3", "s": "Subtítulo"},
                {"t": "p", "s": ("Texto de cuerpo en Inter a 10 pt sobre fondo crema. "
                                 "Interlineado holgado, sin justificar y sin sangría. "
                                 "Los términos destacados usan el verde de AL·LÍO. Cada "
                                 "bloque abre con una regla verde corta a la izquierda.")},
                {"t": "h3", "s": "Lista"},
                {"t": "ul", "items": [
                    "Punto uno de la lista, breve y concreto.",
                    "Punto dos, con el marcador en verde tenue.",
                    "Punto tres para cerrar el bloque.",
                ]},
                {"t": "h3", "s": "Tabla"},
                {"t": "table", "head": ["Campo", "Valor de ejemplo"], "rows": [
                    ["Formato", "A4 · 595 × 842 pt"],
                    ["Tipografía", "Barlow ExtraBold · Inter"],
                ]},
                {"t": "note", "title": "Nota", "s": (
                    "Bloque de nota: regla verde a la izquierda, sin recuadro. Para "
                    "advertencias, matices o aclaraciones breves dentro del texto.")},
                {"t": "figure", "caption": "Figura 1 · Pie de figura", "h": 150},
                {"t": "h3", "s": "Cita"},
                {"t": "quote", "s": ("Una cita destacada usa Inter Medium, regla verde a "
                                     "la izquierda y sin comillas decorativas."),
                 "by": "Fuente de la cita"},
                {"t": "h3", "s": "Código"},
                {"t": "code", "s": "npm ci\nnpm run verify:cheap\nnpm run build"},
                {"t": "p", "s": ("El texto largo fluye solo entre páginas: cuando un "
                                 "bloque no cabe, la página se cierra con su cabecera y "
                                 "folio y el contenido continúa en la siguiente sin "
                                 "cortes ni ajustes manuales. Así, pegar el texto de "
                                 "una issue en la sección correspondiente basta para "
                                 "maquetarla.")},
            ],
        },
    ],
    "closing": {
        "kicker": "Aircury Summer of Code 2026",
        "title": "Fin de la memoria técnica",
        "intro": ("Documento provisional de maquetación. Gracias a Aircury por el "
                  "programa Summer of Code 2026."),
        "meta": [
            ("Autor", "Daniel García Ortega", None),
            ("Repositorio", "github.com/danielgarciaortega-dev/al-lio",
             "https://github.com/danielgarciaortega-dev/al-lio"),
            ("Web", "al-lio.app", "https://al-lio.app"),
        ],
    },
    "output": str(REPO_ROOT / "output" / "pdf" /
                  "AL_LIO_Memoria_Tecnica_PLANTILLA.pdf"),
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
        self.eyebrow(ML, TOP, "AL·LÍO — Memoria técnica", FAINT, 7.6)
        self.rtext(RX, TOP, self.section.upper(), "Inter-B", 7.6, FAINT, track=1.9)
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
        self.section = f"{sec['num']} · {sec['title']}"
        self.new_page(kind="body")
        self.anchor(f"p-sec-{sec['num']}", f"{sec['num']} · {sec['title']}")
        self.y = TOP - 42
        self.text(ML, self.y, sec["num"], "Barlow", 30, GREEN, track=-1)
        self.y -= 34
        self.text(ML, self.y, sec["title"], "Barlow", 18, INK, track=-0.4)
        self.y -= 22
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
        self._need(58)
        self.y -= 8
        self.c.setStrokeColor(GREEN); self.c.setLineWidth(3)
        self.c.line(ML, self.y - 2, ML, self.y + 9.5)
        self.text(ML + 12, self.y, s, "Barlow", 13.5, INK, track=-0.2)
        self.y -= 22

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

    def blk_table(self, head, rows):
        LABEL_X, VAL_X = ML, ML + 130
        label_width = VAL_X - LABEL_X - 14

        def prepared_row(label, value):
            label_lines = self.wrap(label, label_width, "Inter", 9.4)
            value_lines = self.wrap(value, RX - VAL_X, "Inter", 9.4)
            row_height = max(len(label_lines), len(value_lines)) * 14 + 3
            return label_lines, value_lines, row_height

        prepared_rows = [prepared_row(label, value) for label, value in rows]

        def draw_header():
            self.rule(ML, self.y + 12, RX, HAIR, 0.8)
            if head:
                self.text(LABEL_X, self.y, head[0], "Inter-SB", 8.6, GREEN)
                self.text(VAL_X, self.y, head[1], "Inter-SB", 8.6, GREEN)
                self.rule(ML, self.y - 6, RX, HAIR, 0.5)
                self.y -= 17

        first_row_height = prepared_rows[0][2] if prepared_rows else 17
        self._need(20 + (17 if head else 0) + first_row_height)
        draw_header()
        for label_lines, value_lines, row_height in prepared_rows:
            if self.y - row_height < BOT:
                self.new_page(kind="body")
                draw_header()
            row_y = self.y
            for line in label_lines:
                self.text(LABEL_X, row_y, line, "Inter", 9.4, INK)
                row_y -= 14
            row_y = self.y
            for line in value_lines:
                self.text(VAL_X, row_y, line, "Inter", 9.4, BODY)
                row_y -= 14
            self.y -= row_height
            self.rule(ML, self.y + 8, RX, HAIR, 0.5)
        self.y -= 8

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
            self.text(ML + 16, self.y, f"— {by}", "Inter", 8.6, MUTED)
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
            self.ctext(W / 2, figure_y + draw_h / 2 - 3, "FIGURA", "Inter-B", 7.6,
                       FAINT, track=1.9)
        self.y = figure_y - 14
        for line in caption_lines:
            self.text(ML, self.y, line, "Inter-SB", 8, MUTED, track=0.4)
            self.y -= 12
        self.y -= 2

    def section_body(self, sec):
        self.section_header(sec)
        for b in sec["blocks"]:
            t = b["t"]
            if t == "h3":       self.blk_h3(b["s"])
            elif t == "p":      self.blk_p(b["s"])
            elif t == "ul":     self.blk_ul(b["items"])
            elif t == "ol":     self.blk_ul(b["items"], ordered=True)
            elif t == "table":  self.blk_table(b.get("head"), b["rows"])
            elif t == "note":   self.blk_note(b.get("title", "Nota"), b["s"])
            elif t == "quote":  self.blk_quote(b["s"], b.get("by"))
            elif t == "code":   self.blk_code(b["s"])
            elif t == "figure": self.blk_figure(b.get("caption", "Figura"), b.get("h", 150),
                                                 b.get("path"))
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

    toc_nums = [num for _, items in content["toc"]["groups"] for num, _ in items]
    if len(toc_nums) != len(set(toc_nums)):
        raise ValueError("Table-of-contents numbers must be unique")

    missing = sorted(set(section_nums) - set(toc_nums))
    if missing:
        raise ValueError(f"Sections missing from the table of contents: {', '.join(missing)}")


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
