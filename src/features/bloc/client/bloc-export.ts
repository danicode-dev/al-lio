"use client";

import { sanitizeEditorHtml } from "./bloc-editor-helpers";

export function findCanvasPageBreak(
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

export function escapeHtml(value: string) {
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

export function downloadWordFile(filename: string, title: string, html: string) {
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

export function downloadBlob(filename: string, blob: Blob) {
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
