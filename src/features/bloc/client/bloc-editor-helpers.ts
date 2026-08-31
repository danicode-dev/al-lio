"use client";

import { defaultEditorFontSize, type EditorFormatState } from "./bloc-types";

export const initialEditorFormat: EditorFormatState = {
  bold: false,
  italic: false,
  underline: false,
  block: "P",
  alignment: "left",
  list: null,
  fontFamily: "Inter",
  fontSize: defaultEditorFontSize,
};

export function editorFormatAfterCommand(current: EditorFormatState, command: string): EditorFormatState {
  switch (command) {
    case "bold":
      return { ...current, bold: !current.bold };
    case "italic":
      return { ...current, italic: !current.italic };
    case "underline":
      return { ...current, underline: !current.underline };
    case "justifyLeft":
      return { ...current, alignment: "left" };
    case "justifyCenter":
      return { ...current, alignment: "center" };
    case "justifyRight":
      return { ...current, alignment: "right" };
    case "justifyFull":
      return { ...current, alignment: "justify" };
    case "insertUnorderedList":
      return { ...current, list: current.list === "unordered" ? null : "unordered" };
    case "insertOrderedList":
      return { ...current, list: current.list === "ordered" ? null : "ordered" };
    default:
      return current;
  }
}

export function normalizeEditorBlock(value: string): EditorFormatState["block"] {
  const block = value.toUpperCase();
  return block === "H1" || block === "H2" || block === "H3" || block === "BLOCKQUOTE" ? block : "P";
}

export function getEditorText(element: HTMLElement) {
  return (element.innerText || element.textContent || "").replace(/ /g, " ").replace(/\n+$/g, "");
}

export function clampEditorFontSize(value: number) {
  if (!Number.isFinite(value)) return defaultEditorFontSize;
  return Math.min(96, Math.max(8, Math.round(value)));
}

export function queryCommandStateSafe(command: string) {
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
}

export function normalizeFontSizeMarkers(editor: HTMLElement, fontSize: number) {
  editor.querySelectorAll<HTMLFontElement>('font[size="7"]').forEach((font) => {
    const face = font.getAttribute("face");
    const color = font.getAttribute("color");
    if (face) font.style.fontFamily = face;
    if (color) font.style.color = color;
    font.style.fontSize = `${clampEditorFontSize(fontSize)}px`;
    font.removeAttribute("size");
    font.removeAttribute("face");
    font.removeAttribute("color");
  });
}

export function sanitizeEditorHtml(html: string) {
  if (typeof document === "undefined") return html;
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("script, style, iframe, object, embed, link, meta").forEach((node) => node.remove());
  template.content.querySelectorAll("*").forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;
      if (name.startsWith("on")) node.removeAttribute(attribute.name);
      if ((name === "href" || name === "src") && /^\s*javascript:/i.test(value)) node.removeAttribute(attribute.name);
      if (name === "style") {
        const allowed = value
          .split(";")
          .map((part) => part.trim())
          .filter((part) => /^(color|background-color|font-size|font-family|text-align)\s*:/i.test(part))
          .join("; ");
        if (allowed) node.setAttribute("style", allowed);
        else node.removeAttribute("style");
      }
    }
  });
  return template.innerHTML;
}
