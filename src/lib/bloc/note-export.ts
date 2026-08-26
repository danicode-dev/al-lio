// Pure document-model builder for exporting a note. Kept free of DOM/canvas
// APIs so it is unit-testable under Node's test runner; the caller (a "use
// client" component) is responsible for rasterizing this HTML string into a
// PDF, which is a browser-only concern this module does not know about.
export type ExportableNote = {
  title: string;
  contentHtml: string;
};

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function formatExportTimestamp(generatedAt: Date): string {
  if (Number.isNaN(generatedAt.getTime())) return "";
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeStyle: "short" }).format(generatedAt);
}

// `note.contentHtml` is already sanitized by sanitizeEditorHtml at save time
// (the same trust boundary the live editor's own innerHTML assignment
// relies on) so it is embedded verbatim, not re-escaped - only the
// plain-text title needs escaping here.
export function buildNoteExportHtml(note: ExportableNote, generatedAt: Date): string {
  const title = note.title.trim() || "Documento sin titulo";
  const body = note.contentHtml.trim();
  const timestampLabel = formatExportTimestamp(generatedAt);

  return [
    '<div class="al-bloc-export-doc">',
    `<h1 class="al-bloc-export-title">${escapeHtml(title)}</h1>`,
    timestampLabel ? `<p class="al-bloc-export-meta">Exportado el ${escapeHtml(timestampLabel)}</p>` : "",
    `<div class="al-bloc-export-body">${body || '<p class="al-bloc-export-empty">Esta nota todavia no tiene contenido.</p>'}</div>`,
    "</div>",
  ].filter(Boolean).join("\n");
}
