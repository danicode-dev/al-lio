"use client";

import { buildNoteExportHtml } from "@/lib/bloc/note-export";
import { sanitizeEditorHtml } from "./bloc-editor-helpers";
import { textToHtml } from "./bloc-persistence";

function findCanvasPageBreak(
  canvas: HTMLCanvasElement,
  pixels: Uint8ClampedArray | null,
  startY: number,
  maxSliceHeight: number,
): number {
  const remainingHeight = canvas.height - startY;
  if (remainingHeight <= maxSliceHeight) return remainingHeight;
  if (!pixels) return maxSliceHeight;

  // Prefer a nearby blank row so ordinary text lines are not split between
  // pages. If the note contains one uninterrupted image/block, fall back to
  // the exact page boundary instead of dropping any content.
  const searchDepth = Math.min(Math.round(64 * Math.max(window.devicePixelRatio, 1)), Math.round(maxSliceHeight * 0.1));
  const lastCandidate = startY + maxSliceHeight;
  const firstCandidate = lastCandidate - searchDepth;
  const allowedInkPixels = Math.max(2, Math.floor(canvas.width * 0.002));

  for (let candidate = lastCandidate; candidate >= firstCandidate; candidate -= 1) {
    const rowStart = (candidate - 1) * canvas.width * 4;
    const rowEnd = rowStart + canvas.width * 4;
    let inkPixels = 0;
    for (let pixel = rowStart; pixel < rowEnd; pixel += 4) {
      if (pixels[pixel + 3] > 8 && (pixels[pixel] < 248 || pixels[pixel + 1] < 248 || pixels[pixel + 2] < 248)) {
        inkPixels += 1;
        if (inkPixels > allowedInkPixels) break;
      }
    }
    if (inkPixels <= allowedInkPixels) return candidate - startY;
  }

  return maxSliceHeight;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function writeClipboardText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadWordFile(filename: string, title: string, html: string) {
  const documentHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div>${sanitizeEditorHtml(html)}</div>
</body>
</html>`;
  const blob = new Blob(["﻿", documentHtml], { type: "application/msword;charset=utf-8" });
  downloadBlob(filename, blob);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function sanitizeFilename(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").slice(0, 80) || "nota";
}

type ExportableActiveNote = { title: string; contentHtml: string; contentText: string };

// PDF and Word export flows, lifted out of bloc-notepad.tsx so the editor
// orchestrator only wires the ExportMenu handlers. The caller passes the
// active note plus the feedback / in-flight hooks; success is only reported
// once generation actually completes.
export async function exportActivePdf(options: {
  note: ExportableActiveNote | null;
  defaultTitle: string;
  exportingRef: { current: boolean };
  setExporting: (value: boolean) => void;
  showNotice: (text: string, tone?: "info" | "error") => void;
}) {
  const { note, defaultTitle, exportingRef, setExporting, showNotice } = options;
  if (!note || exportingRef.current) return;
  exportingRef.current = true;
  setExporting(true);
  const container = document.createElement("div");
  try {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")]);
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;

    container.className = "al-bloc-export-doc-root";
    // Keep the export surface laid out at the canvas origin. Moving it far
    // off-screen makes jsPDF/html2canvas preserve that negative offset and
    // produces correctly-sized but blank pages. A negative stacking level
    // keeps the temporary surface behind the application while it is
    // rasterized without hiding it from layout/paint.
    container.style.cssText = "position: fixed; top: 0; left: 0; z-index: -1; width: 800px; background: #ffffff; pointer-events: none;";
    container.innerHTML = buildNoteExportHtml({ title: note.title || defaultTitle, contentHtml: note.contentHtml });
    document.body.appendChild(container);

    await document.fonts.ready;
    const renderScale = Math.min(Math.max(window.devicePixelRatio, 1), 2);
    const canvas = await html2canvas(container, {
      scale: renderScale,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });
    const pixelsPerPoint = canvas.width / contentWidth;
    const printableHeight = doc.internal.pageSize.getHeight() - margin * 2;
    const maxSliceHeight = Math.max(1, Math.floor(printableHeight * pixelsPerPoint));
    const sourceContext = canvas.getContext("2d");
    const sourcePixels = sourceContext?.getImageData(0, 0, canvas.width, canvas.height).data ?? null;
    let sourceY = 0;
    let pageIndex = 0;

    while (sourceY < canvas.height) {
      const sliceHeight = findCanvasPageBreak(canvas, sourcePixels, sourceY, maxSliceHeight);
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      const pageContext = pageCanvas.getContext("2d");
      if (!pageContext) throw new Error("No se pudo preparar la página del PDF");
      pageContext.fillStyle = "#ffffff";
      pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      pageContext.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

      if (pageIndex > 0) doc.addPage();
      doc.addImage(
        pageCanvas.toDataURL("image/png"),
        "PNG",
        margin,
        margin,
        contentWidth,
        sliceHeight / pixelsPerPoint,
        undefined,
        "FAST",
      );
      sourceY += sliceHeight;
      pageIndex += 1;
    }

    downloadBlob(`${sanitizeFilename(note.title || "nota")}.pdf`, doc.output("blob"));
    showNotice("PDF exportado");
  } catch {
    showNotice("No se pudo exportar el PDF. Inténtalo de nuevo.", "error");
  } finally {
    container.remove();
    exportingRef.current = false;
    setExporting(false);
  }
}

export function exportActiveWord(options: {
  note: ExportableActiveNote | null;
  defaultTitle: string;
  showNotice: (text: string, tone?: "info" | "error") => void;
}) {
  const { note, defaultTitle, showNotice } = options;
  if (!note) return;
  downloadWordFile(`${sanitizeFilename(note.title || "nota")}.doc`, note.title || defaultTitle, note.contentHtml || textToHtml(note.contentText));
  showNotice("Word exportado");
}
