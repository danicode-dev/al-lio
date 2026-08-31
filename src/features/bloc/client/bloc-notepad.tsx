"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { insertDb, updateDb, deleteDb } from "@/lib/db";
import { fetchBlocNotes, migrateLocalBlocNotes } from "@/lib/bloc/notes-actions";
import { sortByRecentFirst } from "@/lib/bloc/notes-sort";
import { buildNoteExportHtml } from "@/lib/bloc/note-export";
import {
  clampEditorFontSize,
  editorFormatAfterCommand,
  getEditorText,
  initialEditorFormat,
  normalizeEditorBlock,
  normalizeFontSizeMarkers,
  queryCommandStateSafe,
  sanitizeEditorHtml,
} from "./bloc-editor-helpers";
import { BlocEditorEmptyState, BlocEditorToolbar, MobileEditorFormatPanel } from "./bloc-editor-toolbar";
import { downloadBlob, downloadTextFile, downloadWordFile, findCanvasPageBreak, sanitizeFilename, writeClipboardText } from "./bloc-export";
import { emptyListMessage, formatBlocEditedTime, formatBlocNoteCardDate, MobileNoteCard, MobileSheet, MobileSheetRow, TrashSheet, countWords } from "./bloc-note-list";
import { ExportMenu, NoteOverflowMenu, SlidersIcon } from "./bloc-note-menus";
import { createBlocNote, normalizeBlocNotes, normalizeBlocSettings, normalizeBlocTrashed, nowIso, safeJson, textToHtml } from "./bloc-persistence";
import {
  blocKey,
  blocSettingsKey,
  defaultEditorFontSize,
  defaultTitle,
  editorFonts,
  legacyBlocKey,
  legacyBlocSettingsKey,
  type BlocNote,
  type BlocSettings,
  type BlocTrashedNote,
  type EditorFormatState,
  type ListTab,
  type MobileSheetId,
} from "./bloc-types";

export function BlocNotepad() {
  const [notes, setNotes] = useState<BlocNote[]>([]);
  const [trashedNotes, setTrashedNotes] = useState<BlocTrashedNote[]>([]);
  const [activeId, setActiveId] = useState("");
  const [settings, setSettings] = useState<BlocSettings>({ fontSize: "base", defaultTitle });
  const [searchTerm, setSearchTerm] = useState("");
  const [listTab, setListTab] = useState<ListTab>("todas");
  const [showSettings, setShowSettings] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [notice, setNotice] = useState<{ text: string; tone: "info" | "error" } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<MobileSheetId>(null);
  const [titleEditing, setTitleEditing] = useState(false);
  const [phantomId, setPhantomId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [noteMenuOpen, setNoteMenuOpen] = useState(false);
  const [editorFocused, setEditorFocused] = useState(false);
  const [editorFormat, setEditorFormat] = useState<EditorFormatState>(initialEditorFormat);
  const exportingPdfRef = useRef(false);
  const notesRef = useRef<BlocNote[]>([]);
  const trashedRef = useRef<BlocTrashedNote[]>([]);
  const activeIdRef = useRef("");
  const phantomIdRef = useRef<string | null>(null);
  const dbSyncEnabledRef = useRef(false);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editorSelectionRef = useRef<Range | null>(null);
  const inlineFontSizeRef = useRef(defaultEditorFontSize);
  const editorFormatSyncBlockedUntilRef = useRef(0);
  const emptyEditorFormatPendingRef = useRef(false);
  const editorFormatRefreshTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    trashedRef.current = trashedNotes;
  }, [trashedNotes]);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    phantomIdRef.current = phantomId;
  }, [phantomId]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!mobileSheet) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileSheet(null);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileSheet]);

  const attachEditor = useCallback((node: HTMLDivElement | null) => {
    editorRef.current = node;
    if (node) {
      const active = notesRef.current.find((note) => note.id === activeIdRef.current);
      node.innerHTML = active?.contentHtml ?? "";
    }
  }, []);

  const rememberEditorSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return false;
    editorSelectionRef.current = range.cloneRange();
    return true;
  }, []);

  const restoreEditorSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection) return;
    editor.focus();
    const savedRange = editorSelectionRef.current;
    selection.removeAllRanges();
    if (savedRange && editor.contains(savedRange.commonAncestorContainer)) {
      selection.addRange(savedRange);
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.addRange(range);
    editorSelectionRef.current = range.cloneRange();
  }, []);

  const updateEditorFormatFromSelection = useCallback(() => {
    if (Date.now() < editorFormatSyncBlockedUntilRef.current) return;
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0 || !selection.anchorNode || !editor.contains(selection.anchorNode)) return;

    const anchor = selection.anchorNode.nodeType === Node.ELEMENT_NODE
      ? selection.anchorNode as HTMLElement
      : selection.anchorNode.parentElement;
    if (!anchor) return;

    const blockElement = anchor.closest("h1, h2, h3, blockquote, p");
    const blockTag = blockElement?.tagName.toUpperCase();
    const block = blockTag === "H1" || blockTag === "H2" || blockTag === "H3" || blockTag === "BLOCKQUOTE" ? blockTag : "P";
    const listElement = anchor.closest("ol, ul");
    const computed = window.getComputedStyle(anchor);
    const fontFamily = editorFonts.find(({ value }) => computed.fontFamily.toLowerCase().includes(value.toLowerCase()))?.value ?? "Inter";
    const fontSize = clampEditorFontSize(Number.parseFloat(computed.fontSize) || defaultEditorFontSize);
    const computedAlignment = window.getComputedStyle(blockElement ?? anchor).textAlign;
    const alignment = computedAlignment === "center"
      ? "center"
      : computedAlignment === "right" || computedAlignment === "end"
        ? "right"
        : computedAlignment === "justify"
          ? "justify"
          : "left";

    inlineFontSizeRef.current = fontSize;
    setEditorFormat({
      bold: queryCommandStateSafe("bold"),
      italic: queryCommandStateSafe("italic"),
      underline: queryCommandStateSafe("underline"),
      block,
      alignment,
      list: listElement?.tagName === "OL" ? "ordered" : listElement?.tagName === "UL" ? "unordered" : null,
      fontFamily,
      fontSize,
    });
  }, []);

  useEffect(() => {
    function onSelectionChange() {
      if (!rememberEditorSelection()) return;
      updateEditorFormatFromSelection();
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [rememberEditorSelection, updateEditorFormatFromSelection]);

  useEffect(() => () => {
    if (editorFormatRefreshTimeoutRef.current !== null) window.clearTimeout(editorFormatRefreshTimeoutRef.current);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(blocKey) ?? localStorage.getItem(legacyBlocKey);
    const rawSettings = localStorage.getItem(blocSettingsKey) ?? localStorage.getItem(legacyBlocSettingsKey);
    const parsed = raw ? safeJson(raw) : null;
    const savedNotes = normalizeBlocNotes(parsed);
    const savedTrash = normalizeBlocTrashed(parsed);
    const isPhantom = savedNotes.length === 0;
    const initialNotes = isPhantom ? [createBlocNote({ title: defaultTitle })] : savedNotes;

    setSettings(normalizeBlocSettings(rawSettings ? safeJson(rawSettings) : null));
    setNotes(initialNotes);
    setTrashedNotes(savedTrash);
    setActiveId(initialNotes[0].id);
    setPhantomId(isPhantom ? initialNotes[0].id : null);
    setLoaded(true);
  }, []);

  // Synchronise with the database. Existing server notes are authoritative.
  // When the user has no server notes, upload localStorage once. If the
  // connection fails, keep the editor available through localStorage.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let result = await fetchBlocNotes();
        if (cancelled) return;
        if (!result.migrated) {
          const localNotesToMigrate = notesRef.current.filter((note) => note.id !== phantomIdRef.current);
          result = await migrateLocalBlocNotes(localNotesToMigrate, trashedRef.current);
          if (cancelled) return;
        }
        setTrashedNotes(result.trashedNotes);
        if (result.notes.length) {
          setNotes(result.notes);
          setPhantomId(null);
          setActiveId((current) => (result.notes.some((note) => note.id === current) ? current : result.notes[0].id));
        } else {
          const fresh = createBlocNote({ title: defaultTitle });
          setNotes([fresh]);
          setPhantomId(fresh.id);
          setActiveId(fresh.id);
        }
        dbSyncEnabledRef.current = true;
      } catch {
        // Keep localStorage available when the database cannot be reached.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return () => {
      if (notesRef.current.length) {
        localStorage.setItem(blocKey, JSON.stringify({ version: 2, notes: notesRef.current, trashedNotes: trashedRef.current }));
      }
    };
  }, []);

  useEffect(() => {
    if (!loaded || notes.length === 0) return;
    setSaveState("saving");
    const timeoutId = window.setTimeout(() => {
      localStorage.setItem(blocKey, JSON.stringify({ version: 2, notes, trashedNotes }));
      setSaveState("saved");
      if (dbSyncEnabledRef.current) {
        const current = notes.find((note) => note.id === activeIdRef.current);
        if (current) {
          void updateDb("bloc_notes", current.id, { title: current.title, content_html: current.contentHtml, content_text: current.contentText }, []);
        }
      }
    }, 450);
    return () => window.clearTimeout(timeoutId);
  }, [loaded, notes, trashedNotes]);

  useEffect(() => {
    if (!loaded) return;
    const active = notesRef.current.find((note) => note.id === activeId);
    if (editorRef.current) editorRef.current.innerHTML = active?.contentHtml ?? "";
    editorSelectionRef.current = null;
    emptyEditorFormatPendingRef.current = false;
  }, [activeId, loaded]);

  useEffect(() => {
    if (!notice) return;
    const timeoutId = window.setTimeout(() => setNotice(null), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const activeNote = useMemo(() => notes.find((note) => note.id === activeId) ?? null, [activeId, notes]);

  // The phantom note gives an empty editor a local target before a real note
  // exists. It is excluded from lists and the database until the user writes
  // meaningful content.
  const visibleNotes = useMemo(
    () => (phantomId ? notes.filter((note) => note.id !== phantomId) : notes),
    [notes, phantomId],
  );

  const tabNotes = useMemo(() => {
    if (listTab === "favoritas") return visibleNotes.filter((note) => note.favorite);
    if (listTab === "recientes") return sortByRecentFirst(visibleNotes);
    return visibleNotes;
  }, [visibleNotes, listTab]);

  const filteredNotes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return tabNotes;
    return tabNotes.filter((note) => `${note.title} ${note.contentText}`.toLowerCase().includes(query));
  }, [tabNotes, searchTerm]);

  const favoritesCount = useMemo(() => visibleNotes.filter((note) => note.favorite).length, [visibleNotes]);

  const fontClass = { sm: "text-sm", base: "text-base", lg: "text-lg" }[settings.fontSize];
  const wordCount = countWords(activeNote?.contentText ?? "");
  const charCount = activeNote?.contentText.length ?? 0;

  function persistSettings(next: BlocSettings) {
    setSettings(next);
    localStorage.setItem(blocSettingsKey, JSON.stringify(next));
  }

  function showNotice(text: string, tone: "info" | "error" = "info") {
    setNotice({ text, tone });
  }

  // Promote the phantom note on the first meaningful edit. Insert the updated
  // data exactly once and return true so the caller does not also update a row
  // that did not exist before this operation.
  function promotePhantomIfNeeded(
    id: string,
    overrides: Partial<Pick<BlocNote, "title" | "contentHtml" | "contentText" | "favorite">> = {},
    force = false,
  ): boolean {
    if (phantomIdRef.current !== id) return false;
    const base = notesRef.current.find((note) => note.id === id);
    if (!base) return false;
    const title = overrides.title ?? base.title;
    const contentText = overrides.contentText ?? base.contentText;
    const isBlank = (title.trim() === "" || title === defaultTitle) && contentText.trim() === "";
    if (isBlank && !force) return false;
    setPhantomId(null);
    if (dbSyncEnabledRef.current) {
      const contentHtml = overrides.contentHtml ?? base.contentHtml;
      const favorite = overrides.favorite ?? base.favorite;
      void insertDb("bloc_notes", { id, title, content_html: contentHtml, content_text: contentText, is_favorite: favorite, deleted_at: null }, []);
    }
    return true;
  }

  function renameActiveNote(title: string) {
    if (!activeNote) return;
    promotePhantomIfNeeded(activeNote.id, { title });
    const updatedAt = nowIso();
    setNotes((current) => current.map((note) => (note.id === activeNote.id ? { ...note, title, updated_at: updatedAt } : note)));
  }

  function toggleFavorite(id: string) {
    const target = notes.find((note) => note.id === id);
    if (!target) return;
    const nextFavorite = !target.favorite;
    const promoted = promotePhantomIfNeeded(id, { favorite: nextFavorite }, true);
    setNotes((current) => current.map((note) => (note.id === id ? { ...note, favorite: nextFavorite } : note)));
    if (!promoted && dbSyncEnabledRef.current) void updateDb("bloc_notes", id, { is_favorite: nextFavorite }, []);
  }

  function recordEditorContent(preserveEmptyFormatting = false) {
    if (!activeNote || !editorRef.current) return;
    normalizeFontSizeMarkers(editorRef.current, inlineFontSizeRef.current);
    const rawText = getEditorText(editorRef.current);
    const isEmpty = rawText.trim().length === 0;
    if (isEmpty && (preserveEmptyFormatting || emptyEditorFormatPendingRef.current)) {
      emptyEditorFormatPendingRef.current = true;
      return;
    }
    emptyEditorFormatPendingRef.current = false;
    if (isEmpty) editorRef.current.innerHTML = "";

    const updatedAt = nowIso();
    const contentHtml = isEmpty ? "" : sanitizeEditorHtml(editorRef.current.innerHTML);
    const contentText = isEmpty ? "" : rawText;

    promotePhantomIfNeeded(activeNote.id, { contentHtml, contentText });

    setNotes((current) =>
      current.map((note) =>
        note.id === activeNote.id
          ? { ...note, contentHtml, contentText, updated_at: updatedAt }
          : note,
      ),
    );
  }

  function runEditorCommand(command: string, value?: string) {
    const preserveEmptyFormatting = !editorRef.current || getEditorText(editorRef.current).trim().length === 0;
    editorFormatSyncBlockedUntilRef.current = Date.now() + 150;
    restoreEditorSelection();
    document.execCommand(command, false, value);
    recordEditorContent(preserveEmptyFormatting);
    rememberEditorSelection();
    setEditorFormat((current) => editorFormatAfterCommand(current, command));
    if (command === "undo" || command === "redo") scheduleEditorFormatRefresh();
  }

  function scheduleEditorFormatRefresh() {
    if (editorFormatRefreshTimeoutRef.current !== null) window.clearTimeout(editorFormatRefreshTimeoutRef.current);
    editorFormatRefreshTimeoutRef.current = window.setTimeout(() => {
      editorFormatSyncBlockedUntilRef.current = 0;
      editorFormatRefreshTimeoutRef.current = null;
      updateEditorFormatFromSelection();
    }, 160);
  }

  function setEditorFontFamily(value: string) {
    if (!value) return;
    runEditorCommand("fontName", value);
    setEditorFormat((current) => ({ ...current, fontFamily: value }));
  }

  function setEditorFontSize(value: number) {
    const fontSize = clampEditorFontSize(value);
    const preserveEmptyFormatting = !editorRef.current || getEditorText(editorRef.current).trim().length === 0;
    editorFormatSyncBlockedUntilRef.current = Date.now() + 250;
    inlineFontSizeRef.current = fontSize;
    restoreEditorSelection();
    document.execCommand("fontSize", false, "7");
    if (editorRef.current) normalizeFontSizeMarkers(editorRef.current, fontSize);
    recordEditorContent(preserveEmptyFormatting);
    rememberEditorSelection();
    setEditorFormat((current) => ({ ...current, fontSize }));
  }

  function createNote() {
    const note = createBlocNote({ title: settings.defaultTitle.trim() || defaultTitle });
    setNotes((current) => [note, ...current]);
    setActiveId(note.id);
    setSearchTerm("");
    setListTab("todas");
    showNotice("Nota creada");
    if (dbSyncEnabledRef.current) {
      void insertDb("bloc_notes", { id: note.id, title: note.title, content_html: note.contentHtml, content_text: note.contentText, is_favorite: false, deleted_at: null }, []);
    }
  }

  function duplicateNote(note = activeNote) {
    if (!note) return;
    const copy = createBlocNote({
      title: `${note.title || defaultTitle} copia`,
      contentHtml: note.contentHtml,
      contentText: note.contentText,
    });
    setNotes((current) => [copy, ...current]);
    setActiveId(copy.id);
    setSearchTerm("");
    showNotice("Nota duplicada");
    if (dbSyncEnabledRef.current) {
      void insertDb("bloc_notes", { id: copy.id, title: copy.title, content_html: copy.contentHtml, content_text: copy.contentText, is_favorite: false, deleted_at: null }, []);
    }
  }

  function deleteNote(id: string) {
    if (id === phantomId) {
      // A note that was never persisted does not need a trash operation.
      const fresh = createBlocNote({ title: defaultTitle });
      setNotes((current) => current.map((note) => (note.id === id ? fresh : note)));
      setPhantomId(fresh.id);
      setActiveId(fresh.id);
      return;
    }

    const target = notes.find((note) => note.id === id);
    if (!target) return;

    const next = notes.filter((note) => note.id !== id);
    setTrashedNotes((current) => [{ ...target, deleted_at: nowIso() }, ...current]);

    if (next.length === 0) {
      const fresh = createBlocNote({ title: defaultTitle });
      setNotes([fresh]);
      setPhantomId(fresh.id);
      setActiveId(fresh.id);
    } else {
      setNotes(next);
      if (activeId === id) setActiveId(next[0].id);
    }
    showNotice("Nota movida a la papelera");
    if (dbSyncEnabledRef.current) void updateDb("bloc_notes", id, { deleted_at: nowIso() }, []);
  }

  function restoreNote(id: string) {
    const target = trashedNotes.find((note) => note.id === id);
    if (!target) return;
    const restored: BlocNote = {
      id: target.id,
      title: target.title,
      contentHtml: target.contentHtml,
      contentText: target.contentText,
      favorite: target.favorite,
      created_at: target.created_at,
      updated_at: target.updated_at,
    };
    setTrashedNotes((current) => current.filter((note) => note.id !== id));
    setNotes((current) => [restored, ...current]);
    setActiveId(restored.id);
    showNotice("Nota restaurada");
    if (dbSyncEnabledRef.current) void updateDb("bloc_notes", id, { deleted_at: null }, []);
  }

  function purgeNote(id: string) {
    const target = trashedNotes.find((note) => note.id === id);
    if (!target) return;
    if (!window.confirm(`Eliminar definitivamente "${target.title || defaultTitle}"? No se puede deshacer.`)) return;
    setTrashedNotes((current) => current.filter((note) => note.id !== id));
    showNotice("Nota eliminada definitivamente");
    if (dbSyncEnabledRef.current) void deleteDb("bloc_notes", id, []);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    recordEditorContent();
  }

  function handleEditorKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    event.preventDefault();
    document.execCommand("insertText", false, "  ");
    recordEditorContent();
  }

  // A contenteditable swallows link navigation, so every link inside a note -
  // the "Ir al momento" stamps that video notes add, and any link a student
  // pastes - only works because this handler follows it. Modifier / non-left
  // clicks are left to the browser so "open in new tab" keeps working.
  function handleEditorClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest<HTMLAnchorElement>("a[href]");
    const href = link?.getAttribute("href")?.trim();
    if (!href) return;

    let destination: URL;
    try {
      destination = new URL(href, window.location.origin);
    } catch {
      return; // Malformed href - leave the editor content untouched.
    }
    if (destination.protocol !== "http:" && destination.protocol !== "https:") return;

    event.preventDefault();
    if (destination.origin === window.location.origin) {
      // A full load (not router.push) so the learning page always remounts
      // and re-applies the ?at= seek even when it is already the open route.
      window.location.assign(`${destination.pathname}${destination.search}${destination.hash}`);
    } else {
      window.open(destination.href, "_blank", "noopener,noreferrer");
    }
  }

  function setParagraphBlock(value: string) {
    if (!value) return;
    const preserveEmptyFormatting = !editorRef.current || getEditorText(editorRef.current).trim().length === 0;
    editorFormatSyncBlockedUntilRef.current = Date.now() + 150;
    restoreEditorSelection();
    document.execCommand("formatBlock", false, value);
    recordEditorContent(preserveEmptyFormatting);
    rememberEditorSelection();
    setEditorFormat((current) => ({ ...current, block: normalizeEditorBlock(value) }));
  }

  async function copyActiveNote() {
    if (!activeNote) return;
    await writeClipboardText(activeNote.contentText);
    showNotice("Texto copiado");
  }

  function downloadActiveNote() {
    if (!activeNote) return;
    downloadTextFile(`${sanitizeFilename(activeNote.title || "nota")}.txt`, activeNote.contentText);
    showNotice("Descarga preparada");
  }

  async function exportActivePdf() {
    if (!activeNote || exportingPdfRef.current) return;
    exportingPdfRef.current = true;
    setExportingPdf(true);
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
      container.innerHTML = buildNoteExportHtml({ title: activeNote.title || defaultTitle, contentHtml: activeNote.contentHtml });
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

      downloadBlob(`${sanitizeFilename(activeNote.title || "nota")}.pdf`, doc.output("blob"));
      showNotice("PDF exportado");
    } catch {
      showNotice("No se pudo exportar el PDF. Inténtalo de nuevo.", "error");
    } finally {
      container.remove();
      exportingPdfRef.current = false;
      setExportingPdf(false);
    }
  }

  function exportActiveWord() {
    if (!activeNote) return;
    downloadWordFile(`${sanitizeFilename(activeNote.title || "nota")}.doc`, activeNote.title || defaultTitle, activeNote.contentHtml || textToHtml(activeNote.contentText));
    showNotice("Word exportado");
  }

  if (!loaded) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Cargando notas...
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="al-bloc-mobile-layout relative">
        <style>{blocBrandCss}</style>
        <div className="flex items-center gap-2">
          <div className="al-bloc-search relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a958a]" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar notas..."
              className="h-10 rounded-xl pl-9"
            />
          </div>
          <button type="button" className="al-bloc-icon-btn h-10 w-10 rounded-xl" onClick={() => setMobileSheet("settings")} aria-label="Ajustes y papelera">
            <SlidersIcon />
          </button>
          <button type="button" className="al-bloc-primary-btn al-bloc-mobile-create h-10 w-10 rounded-xl p-0" onClick={createNote} aria-label="Nueva nota">
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="al-bloc-mobile-notes mt-2 flex snap-x gap-2 overflow-x-auto pb-1">
          {filteredNotes.map((note) => (
            <MobileNoteCard
              key={note.id}
              note={note}
              active={note.id === activeId}
              onSelect={() => { setActiveId(note.id); setTitleEditing(false); }}
              onDelete={() => deleteNote(note.id)}
            />
          ))}
          {filteredNotes.length === 0 && (
            <div className="w-full rounded-xl border border-dashed px-3 py-2 text-center text-xs text-[#6b6f72]">
              {emptyListMessage(listTab, searchTerm)}
            </div>
          )}
        </div>

        <section className="al-bloc-editor-shell mt-2 overflow-hidden rounded-2xl">
          <div className="al-bloc-mobile-title-row flex min-h-12 items-center gap-1 px-3 py-2">
            {titleEditing ? (
              <Input
                autoFocus
                value={activeNote?.title ?? ""}
                onChange={(event) => renameActiveNote(event.target.value)}
                onBlur={() => setTitleEditing(false)}
                onKeyDown={(event) => event.key === "Enter" && setTitleEditing(false)}
                placeholder={defaultTitle}
                className="h-9 min-w-0 flex-1 text-base font-bold"
              />
            ) : (
              <button type="button" className="al-bloc-mobile-title-button flex min-w-0 flex-1 items-center gap-1.5 text-left" onClick={() => setTitleEditing(true)} aria-label="Editar título">
                <h2 className="truncate text-lg font-bold leading-tight text-[#111111]">{activeNote?.title || defaultTitle}</h2>
                <Pencil className="h-3.5 w-3.5 shrink-0 text-[#9a958a]" />
              </button>
            )}
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                className="al-bloc-icon-btn-ghost flex h-9 w-9 items-center justify-center"
                onClick={() => activeNote && toggleFavorite(activeNote.id)}
                aria-label={activeNote?.favorite ? "Quitar de favoritas" : "Marcar como favorita"}
                title={activeNote?.favorite ? "Quitar de favoritas" : "Marcar como favorita"}
              >
                <Star className={cn("h-4 w-4", activeNote?.favorite && "al-bloc-star-active")} fill={activeNote?.favorite ? "currentColor" : "none"} />
              </button>
            </div>
          </div>

          <BlocEditorToolbar
            mobile
            formatState={editorFormat}
            onCommand={runEditorCommand}
            onBlockChange={setParagraphBlock}
            onFontFamily={setEditorFontFamily}
            onFontSize={setEditorFontSize}
            onColor={(color) => runEditorCommand("foreColor", color)}
            onHighlight={(color) => runEditorCommand("backColor", color)}
          />

          <div className="al-bloc-content-wrap">
            {wordCount === 0 && !editorFocused && <BlocEditorEmptyState />}
            <div
              ref={attachEditor}
              role="textbox"
              aria-label="Editor de nota"
              aria-multiline="true"
              contentEditable
              suppressContentEditableWarning
              spellCheck
              data-placeholder="Escribe tu nota..."
              onFocus={() => setEditorFocused(true)}
              onInput={() => { recordEditorContent(); rememberEditorSelection(); updateEditorFormatFromSelection(); }}
              onBlur={() => { setEditorFocused(false); recordEditorContent(); }}
              onPaste={handlePaste}
              onKeyDown={handleEditorKeyDown}
              onKeyUp={() => { rememberEditorSelection(); updateEditorFormatFromSelection(); }}
              onMouseUp={() => { rememberEditorSelection(); updateEditorFormatFromSelection(); }}
              onClick={handleEditorClick}
              className={cn(
                "al-bloc-content empty:before:pointer-events-none empty:before:text-[#9a958a] empty:before:content-[attr(data-placeholder)]",
                "min-h-[clamp(220px,38dvh,420px)] max-h-[52dvh] flex-1 overflow-y-auto px-4 py-3 leading-6 outline-none",
                fontClass,
              )}
            />
          </div>

          <div className="al-bloc-mobile-actions flex items-center px-2 py-1.5">
            <button type="button" className="al-bloc-mobile-action" onClick={() => setMobileSheet("format")} aria-label="Abrir formato del documento">
              <span className="text-base font-medium" aria-hidden="true">T</span>
              <span>Formato</span>
            </button>
            <ExportMenu
              mobileAction
              open={exportMenuOpen}
              onOpenChange={setExportMenuOpen}
              noteTitle={activeNote?.title || defaultTitle}
              disabled={!activeNote}
              exporting={exportingPdf}
              onExportPdf={exportActivePdf}
              onExportWord={exportActiveWord}
              onExportTxt={downloadActiveNote}
            />
            <NoteOverflowMenu
              mobileAction
              open={noteMenuOpen}
              onOpenChange={setNoteMenuOpen}
              disabled={!activeNote}
              onDuplicate={() => duplicateNote()}
              onCopyText={copyActiveNote}
              onDelete={() => activeNote && deleteNote(activeNote.id)}
            />
          </div>

          <div className="al-bloc-mobile-status flex min-h-8 items-center justify-between gap-2 px-3 py-1.5 text-[11px] text-[#6b6f72]">
            <span className="min-w-0 truncate">
              <span className="al-bloc-save-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" />
              {saveState === "saving" ? "Guardando..." : "Guardado"}
              {notice ? <span role="status" className={cn("ml-1 font-semibold", notice.tone === "error" ? "text-[#c23a2e]" : "text-[#c94f21]")}>· {notice.text}</span> : null}
            </span>
            <span className="shrink-0" title={`Última edición: ${activeNote ? formatBlocEditedTime(activeNote.updated_at) : "--:--"}`}>{wordCount} palabras</span>
          </div>
        </section>

        {mobileSheet === "settings" && (
          <MobileSheet title="Ajustes del bloc" onClose={() => setMobileSheet(null)}>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[#9a958a]">Título por defecto</p>
            <Input
              value={settings.defaultTitle}
              onChange={(event) => persistSettings({ ...settings, defaultTitle: event.target.value })}
              placeholder={defaultTitle}
              className="h-11"
            />
            <MobileSheetRow label="Ver papelera" onClick={() => { setMobileSheet(null); setShowTrash(true); }}>
              <Trash2 className="h-4 w-4" />
            </MobileSheetRow>
          </MobileSheet>
        )}

        {mobileSheet === "format" && (
          <MobileSheet title="Formato del documento" onClose={() => setMobileSheet(null)}>
            <MobileEditorFormatPanel
              formatState={editorFormat}
              onCommand={runEditorCommand}
              onBlockChange={setParagraphBlock}
              onFontFamily={setEditorFontFamily}
              onFontSize={setEditorFontSize}
              onColor={(color) => runEditorCommand("foreColor", color)}
              onHighlight={(color) => runEditorCommand("backColor", color)}
            />
          </MobileSheet>
        )}

        {showTrash && (
          <TrashSheet trashedNotes={trashedNotes} onClose={() => setShowTrash(false)} onRestore={restoreNote} onPurge={purgeNote} />
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <style>{blocBrandCss}</style>
      <div className="al-bloc-desktop-grid grid gap-4 md:grid-cols-[minmax(0,1fr)_300px]">
        <div className="al-bloc-editor-shell min-w-0 overflow-hidden rounded-2xl">
          <div className="al-bloc-title-row flex items-center gap-1.5 px-5 py-4">
            <Input
              value={activeNote?.title ?? ""}
              onChange={(event) => renameActiveNote(event.target.value)}
              placeholder={defaultTitle}
              className="al-bloc-title-input h-auto flex-1 border-none bg-transparent px-0 text-xl font-bold shadow-none focus-visible:ring-0"
            />
            <button
              type="button"
              className="al-bloc-icon-btn-ghost flex h-9 w-9 shrink-0 items-center justify-center"
              onClick={() => activeNote && toggleFavorite(activeNote.id)}
              aria-label="Favorita"
            >
              <Star className={cn("h-5 w-5", activeNote?.favorite && "al-bloc-star-active")} fill={activeNote?.favorite ? "currentColor" : "none"} />
            </button>
            <ExportMenu
              open={exportMenuOpen}
              onOpenChange={setExportMenuOpen}
              noteTitle={activeNote?.title || defaultTitle}
              disabled={!activeNote}
              exporting={exportingPdf}
              onExportPdf={exportActivePdf}
              onExportWord={exportActiveWord}
              onExportTxt={downloadActiveNote}
            />
            <NoteOverflowMenu
              open={noteMenuOpen}
              onOpenChange={setNoteMenuOpen}
              disabled={!activeNote}
              onDuplicate={() => duplicateNote()}
              onCopyText={copyActiveNote}
              onDelete={() => activeNote && deleteNote(activeNote.id)}
            />
          </div>

          <BlocEditorToolbar
            formatState={editorFormat}
            onCommand={runEditorCommand}
            onBlockChange={setParagraphBlock}
            onFontFamily={setEditorFontFamily}
            onFontSize={setEditorFontSize}
            onColor={(color) => runEditorCommand("foreColor", color)}
            onHighlight={(color) => runEditorCommand("backColor", color)}
          />

          <div className="al-bloc-content-wrap">
            {wordCount === 0 && !editorFocused && <BlocEditorEmptyState />}
            <div
              ref={attachEditor}
              role="textbox"
              aria-label="Editor de nota"
              aria-multiline="true"
              contentEditable
              suppressContentEditableWarning
              spellCheck
              data-placeholder="Escribe tu nota..."
              onFocus={() => setEditorFocused(true)}
              onInput={() => { recordEditorContent(); rememberEditorSelection(); updateEditorFormatFromSelection(); }}
              onBlur={() => { setEditorFocused(false); recordEditorContent(); }}
              onPaste={handlePaste}
              onKeyDown={handleEditorKeyDown}
              onKeyUp={() => { rememberEditorSelection(); updateEditorFormatFromSelection(); }}
              onMouseUp={() => { rememberEditorSelection(); updateEditorFormatFromSelection(); }}
              onClick={handleEditorClick}
              className={cn(
                "al-bloc-content empty:before:pointer-events-none empty:before:text-[#9a958a] empty:before:content-[attr(data-placeholder)]",
                "min-h-[430px] flex-1 overflow-y-auto px-8 py-6 leading-7 outline-none",
                fontClass,
              )}
            />
          </div>

          <div className="al-bloc-footer flex flex-col gap-3 px-4 py-3 text-xs lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <span className="al-bloc-save-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" />
              <span>{saveState === "saving" ? "Guardando..." : "Guardado automáticamente"}</span>
              <span> · Última edición: {activeNote ? formatBlocEditedTime(activeNote.updated_at) : "--:--"}</span>
              {notice && (
                <span role="status" className={cn("ml-2 font-semibold", notice.tone === "error" ? "text-[#c23a2e]" : "text-[#c94f21]")}>
                  {notice.text}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              <span>Palabras: {wordCount}</span>
              <span>Caracteres: {charCount}</span>
            </div>
          </div>
        </div>

        <aside className="al-bloc-sidebar flex min-h-[520px] flex-col rounded-2xl">
          <button type="button" className="al-bloc-primary-btn al-bloc-primary-btn-compact flex w-full items-center justify-center gap-1.5" onClick={createNote}>
            <Plus className="h-3.5 w-3.5" />
            Nueva nota
          </button>

          <div className="mt-3 flex items-center gap-2">
            <div className="al-bloc-search relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a958a]" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar notas..."
                className="h-9 pl-9 text-sm"
              />
            </div>
            <button type="button" className={cn("al-bloc-icon-btn h-9 w-9 shrink-0", showSettings && "al-bloc-icon-btn-active")} onClick={() => setShowSettings((value) => !value)} aria-label="Ajustes del bloc">
              <SlidersIcon />
            </button>
          </div>

          <div className="al-bloc-tabs mt-3">
            {([["todas", "Todas"], ["recientes", "Recientes"], ["favoritas", "Favoritas"]] as const).map(([id, label]) => (
              <button key={id} type="button" className={cn("al-bloc-tab", listTab === id && "al-bloc-tab-active")} onClick={() => setListTab(id)}>
                {label}{id === "favoritas" && favoritesCount > 0 ? ` ${favoritesCount}` : ""}
              </button>
            ))}
          </div>

          {showSettings && (
            <div className="al-bloc-settings-panel mt-3">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#9a958a]">Título por defecto</p>
                <Input value={settings.defaultTitle} onChange={(event) => persistSettings({ ...settings, defaultTitle: event.target.value })} placeholder={defaultTitle} className="h-8 text-xs" />
              </div>
            </div>
          )}

          <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
            {filteredNotes.map((note) => (
              <div key={note.id} className="al-bloc-note-row group">
                <button type="button" className={cn("al-bloc-note-card", note.id === activeId && "al-bloc-note-card-active")} onClick={() => setActiveId(note.id)}>
                  <div className="flex items-start justify-between gap-1">
                    <span className="block truncate text-sm font-semibold">{note.title || defaultTitle}</span>
                    {note.favorite && <Star className="al-bloc-note-card-star h-3.5 w-3.5 shrink-0" fill="currentColor" />}
                  </div>
                  <span className="al-bloc-note-card-meta mt-1 block truncate text-xs">
                    {countWords(note.contentText)} palabras · {formatBlocNoteCardDate(note.updated_at)}
                  </span>
                </button>
                <button type="button" className="al-bloc-note-row-delete" onClick={() => deleteNote(note.id)} aria-label="Eliminar nota" title="Eliminar nota">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {filteredNotes.length === 0 && (
              <div className="al-bloc-list-empty">
                <Image src="/assets/bloc/bloc-empty-illustration.png" alt="" width={480} height={343} className="al-bloc-list-empty-img" />
                <p>{emptyListMessage(listTab, searchTerm)}</p>
              </div>
            )}
          </div>

          <button type="button" className="al-bloc-trash-link mt-3 flex items-center justify-between border-t pt-3 text-xs font-semibold" onClick={() => setShowTrash(true)}>
            <span className="flex items-center gap-1.5"><Trash2 className="h-3.5 w-3.5" />Ver papelera</span>
            {trashedNotes.length > 0 && <span className="al-bloc-trash-count">{trashedNotes.length}</span>}
          </button>
        </aside>
      </div>

      {showTrash && (
        <TrashSheet trashedNotes={trashedNotes} onClose={() => setShowTrash(false)} onRestore={restoreNote} onPurge={purgeNote} />
      )}
    </div>
  );
}

const blocBrandCss = `
  .al-bloc-desktop-grid { align-items: stretch; }
  .al-bloc-editor-shell { min-height: 0; background: white; border: 1px solid #ece7dc; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.05); display: flex; flex-direction: column; }
  .al-bloc-title-row { border-bottom: 1px solid #f0ece2; }
  .al-bloc-title-input { color: #111111; }
  .al-bloc-title-input::placeholder { color: #9a958a; }
  .al-bloc-toolbar { border-bottom: 1px solid #f0ece2; background: #faf8f4; }
  .al-bloc-toolbar-row { min-width: 0; flex-wrap: nowrap; }
  .al-bloc-toolbar-desktop .al-bloc-toolbar-row { gap: 1px; padding: 8px 6px; }
  .al-bloc-toolbar-desktop .al-bloc-tool-btn { min-width: 28px; padding-right: 5px; padding-left: 5px; }
  .al-bloc-toolbar-desktop .al-bloc-toolbar-divider { margin-right: 1px; margin-left: 1px; }
  .al-bloc-toolbar-desktop .al-bloc-toolbar-select { padding-right: 21px; padding-left: 7px; font-size: 11px; }
  .al-bloc-toolbar-divider { width: 1px; height: 20px; background: #ece7dc; margin: 0 2px; flex-shrink: 0; }
  .al-bloc-tool-btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 32px; min-width: 32px; padding: 0 7px; border-radius: 8px; border: none; background: transparent; color: #6b6f72; cursor: pointer; }
  .al-bloc-tool-btn:hover { background: white; color: #c94f21; }
  .al-bloc-tool-btn-active { background: #f7ded2; color: #b9471f; box-shadow: inset 0 0 0 1px rgba(225, 93, 45, 0.18); }
  .al-bloc-tool-btn-active:hover { background: #f7ded2; color: #a73d18; }
  .al-bloc-tool-group { display: inline-flex; align-items: center; gap: 1px; flex-shrink: 0; }
  .al-bloc-size-group { display: inline-flex; align-items: center; gap: 1px; flex-shrink: 0; overflow: hidden; border: 1px solid #ece7dc; border-radius: 8px; background: white; }
  .al-bloc-size-group .al-bloc-tool-btn { height: 30px; min-width: 28px; padding: 0 6px; border-radius: 7px; }
  .al-bloc-font-size-field { display: flex; height: 30px; align-items: center; justify-content: center; border-left: 1px solid #f0ece2; border-right: 1px solid #f0ece2; color: #9a958a; }
  .al-bloc-font-size-field input { box-sizing: border-box; width: 32px; height: 28px; appearance: textfield; border: 0; background: transparent; padding: 0 2px; color: #333029; font-size: 12px; font-weight: 700; line-height: 28px; outline: none; text-align: right; }
  .al-bloc-font-size-field input::-webkit-inner-spin-button, .al-bloc-font-size-field input::-webkit-outer-spin-button { appearance: none; margin: 0; }
  .al-bloc-font-size-field span { padding: 0 5px 0 1px; font-size: 9px; font-weight: 700; line-height: 30px; text-transform: uppercase; }
  .al-bloc-toolbar-select { box-sizing: border-box; height: 32px; flex-shrink: 0; border: 1px solid #ece7dc; border-radius: 8px; background: white; padding: 0 26px 0 8px; color: #333029; font-size: 12px; line-height: normal; }
  .al-bloc-paragraph-select { width: 126px; }
  .al-bloc-font-select { width: 114px; }
  .al-bloc-list-select { width: 120px; }
  .al-bloc-toolbar-select-active { border-color: rgba(225, 93, 45, 0.35); background: #fff7f2; color: #b9471f; }
  .al-bloc-color-tool { position: relative; flex-shrink: 0; }
  .al-bloc-color-input { position: absolute; inset: 0; height: 100%; width: 100%; cursor: pointer; opacity: 0; }
  .al-bloc-toolbar-mobile .al-bloc-toolbar-row { width: 100%; gap: 2px; overflow: hidden; padding: 6px; }
  .al-bloc-toolbar-mobile .al-bloc-tool-btn { width: 30px; min-width: 30px; padding: 0; }
  .al-bloc-toolbar-mobile .al-bloc-toolbar-divider { margin: 0; }
  .al-bloc-toolbar-mobile .al-bloc-toolbar-divider { height: 18px; }
  .al-bloc-mobile-size-select { display: flex; width: 58px; min-width: 0; flex: 1 1 58px; }
  .al-bloc-mobile-size-select select { box-sizing: border-box; width: 100%; height: 32px; border: 1px solid #ece7dc; border-radius: 8px; background: white; padding: 0 15px 0 5px; color: #333029; font-size: 11px; font-weight: 700; outline: none; }
  .al-bloc-mobile-size-select:focus-within select, .al-bloc-mobile-icon-select:focus-within { border-color: rgba(225, 93, 45, 0.5); box-shadow: 0 0 0 2px rgba(225, 93, 45, 0.12); }
  .al-bloc-mobile-icon-select { position: relative; display: inline-flex; width: 38px; min-width: 38px; height: 32px; flex-shrink: 0; align-items: center; justify-content: center; gap: 2px; border: 1px solid #ece7dc; border-radius: 8px; background: white; color: #6b6f72; }
  .al-bloc-mobile-icon-select select { position: absolute; inset: 0; width: 100%; height: 100%; cursor: pointer; opacity: 0; }
  .al-bloc-mobile-select-chevron { width: 9px; height: 9px; }
  .al-bloc-content-wrap { position: relative; display: flex; min-height: 0; flex: 1; overflow: hidden; background: white; }
  .al-bloc-editor-empty { position: absolute; z-index: 2; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; pointer-events: none; text-align: center; }
  .al-bloc-editor-empty-icon { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 16px; background: #f7f4ee; color: #aaa399; }
  .al-bloc-editor-empty p { margin: 12px 0 0; color: #333029; font-size: 14px; font-weight: 800; }
  .al-bloc-editor-empty > span:last-child { margin-top: 4px; max-width: 360px; color: #777269; font-size: 12px; line-height: 20px; }
  .al-bloc-content { position: relative; z-index: 1; min-width: 0; color: #333029; overflow-wrap: anywhere; }
  /* The editor is contenteditable, so links otherwise inherit the text
     caret. A pointer plus a hover colour is the only affordance that a
     "Ir al momento" link (or any pasted link) can actually be followed. */
  .al-bloc-content a { color: #c94f21; text-decoration: underline; cursor: pointer; }
  .al-bloc-content a:hover { color: #a63f1a; }
  .al-bloc-content p { margin: 0 0 8px; }
  .al-bloc-content hr { margin: 12px 0 14px; border: 0; border-top: 1px solid #ece7dc; }
  .al-bloc-content blockquote { border-left: 3px solid #ece7dc; padding-left: 14px; color: #6b6f72; }
  .al-bloc-content h1 { font-size: 1.7em; font-weight: 700; color: #111111; }
  .al-bloc-content h2 { font-size: 1.4em; font-weight: 700; color: #111111; }
  .al-bloc-content h3 { font-size: 1.15em; font-weight: 700; color: #111111; }
  .al-bloc-content ol { list-style: decimal; padding-left: 24px; }
  .al-bloc-content ul { list-style: disc; padding-left: 24px; }
  .al-bloc-content img { max-width: 100%; border-radius: 8px; margin: 6px 0; }
  .al-bloc-footer { border-top: 1px solid #f0ece2; background: #faf8f4; color: #6b6f72; }
  .al-bloc-save-dot { background: #4C9A6E; }
  .al-bloc-header-btn { border-radius: 10px; border: 1px solid #ece7dc; background: white; color: #333029; font-size: 12.5px; font-weight: 600; cursor: pointer; }
  .al-bloc-header-btn:hover { border-color: rgba(225, 93, 45, 0.35); color: #c94f21; }
  .al-bloc-header-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .al-bloc-menu { background: white; border: 1px solid #ece7dc; box-shadow: 0 16px 36px rgba(17,17,17,0.12); }
  .al-bloc-menu-item { display: flex; width: 100%; align-items: center; gap: 8px; border-radius: 8px; border: none; background: none; padding: 8px 10px; font-size: 12.5px; font-weight: 600; color: #333029; cursor: pointer; text-align: left; }
  .al-bloc-menu-item:hover { background: #faf8f4; }
  .al-bloc-menu-item-danger { color: #c23a2e; }
  .al-bloc-menu-item-danger:hover { background: #fbe2df; }
  .al-bloc-menu-divider { height: 1px; margin: 4px 6px; background: #f0ece2; }
  .al-bloc-export-doc { padding: 32px; color: #25221d; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
  .al-bloc-export-title { margin: 0 0 4px; font-size: 22px; font-weight: 700; color: #111111; }
  .al-bloc-export-title + .al-bloc-export-body { margin-top: 18px; }
  .al-bloc-export-body { font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; word-break: break-word; }
  .al-bloc-export-body p { margin: 0 0 10px; }
  .al-bloc-export-body h1 { font-size: 1.6em; font-weight: 700; margin: 0.6em 0 0.3em; }
  .al-bloc-export-body h2 { font-size: 1.3em; font-weight: 700; margin: 0.6em 0 0.3em; }
  .al-bloc-export-body h3 { font-size: 1.1em; font-weight: 700; margin: 0.6em 0 0.3em; }
  .al-bloc-export-body ol { list-style: decimal; padding-left: 24px; margin: 0 0 10px; }
  .al-bloc-export-body ul { list-style: disc; padding-left: 24px; margin: 0 0 10px; }
  .al-bloc-export-body a { color: #c94f21; text-decoration: underline; }
  .al-bloc-export-body img { max-width: 100%; }
  .al-bloc-export-body blockquote { border-left: 3px solid #ece7dc; padding-left: 14px; color: #6b6f72; margin: 0 0 10px; }
  .al-bloc-export-empty { color: #9a958a; font-style: italic; }
  .al-bloc-icon-btn { display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid #ece7dc; background: white; color: #6b6f72; cursor: pointer; }
  .al-bloc-icon-btn:hover { border-color: rgba(225, 93, 45, 0.35); color: #c94f21; }
  .al-bloc-icon-btn-active { background: #fbe7dd; border-color: rgba(225, 93, 45, 0.3); color: #c94f21; }
  .al-bloc-icon-btn-ghost { border-radius: 9px; border: none; background: transparent; color: #6b6f72; cursor: pointer; }
  .al-bloc-icon-btn-ghost:hover { background: #f3ece1; color: #111111; }
  .al-bloc-icon-btn-danger:hover { background: #fbe2df; color: #c23a2e; }
  .al-bloc-star-active { color: #E15D2D; }
  .al-bloc-primary-btn { display: inline-flex; align-items: center; justify-content: center; height: 40px; border-radius: 12px; border: 1px solid var(--al-action-soft-border); background: var(--al-action-soft-bg); color: var(--al-action-soft-text); font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(80, 43, 27, 0.05); transition: background .15s, border-color .15s, color .15s; }
  .al-bloc-primary-btn:hover { border-color: var(--al-action-soft-border-hover); background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); }
  .al-bloc-primary-btn-compact { height: 34px; border-radius: 10px; font-size: 12px; }
  .al-bloc-list-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 8px; text-align: center; border-radius: 12px; border: 1px dashed #ece7dc; }
  .al-bloc-list-empty-img { width: 96px; height: auto; opacity: 0.85; }
  .al-bloc-list-empty p { font-size: 12px; color: #6b6f72; margin: 0; }
  .al-bloc-search input { border: 1px solid #ece7dc; border-radius: 10px; background: white; }
  .al-bloc-sidebar { min-height: 0; overflow: hidden; background: white; border: 1px solid #ece7dc; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.05); padding: 14px; }
  .al-bloc-tabs { display: flex; align-items: center; gap: 2px; border-radius: 11px; border: 1px solid #ece7dc; background: #faf8f4; padding: 3px; }
  .al-bloc-tab { flex: 1; height: 28px; border-radius: 8px; font-size: 11px; font-weight: 600; color: #6b6f72; background: transparent; border: none; cursor: pointer; }
  .al-bloc-tab-active { background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); box-shadow: inset 0 0 0 1px var(--al-action-soft-border); }
  .al-bloc-settings-panel { border: 1px solid #ece7dc; border-radius: 12px; background: #faf8f4; padding: 10px; }
  .al-bloc-note-row { display: flex; align-items: stretch; gap: 2px; }
  .al-bloc-note-card { min-width: 0; flex: 1; border-radius: 10px; padding: 8px 10px; text-align: left; background: transparent; border: none; cursor: pointer; color: #333029; }
  .al-bloc-note-card:hover { background: #faf8f4; }
  .al-bloc-note-card-active { background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); box-shadow: inset 0 0 0 1px var(--al-action-soft-border); }
  .al-bloc-note-card-active:hover { background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); }
  .al-bloc-note-card-meta { color: #9a958a; }
  .al-bloc-note-card-active .al-bloc-note-card-meta { color: #8f7468; }
  .al-bloc-note-card-star { color: #b94720; }
  .al-bloc-note-card:not(.al-bloc-note-card-active) .al-bloc-note-card-star { color: #E15D2D; }
  .al-bloc-note-row-delete { display: flex; align-items: center; justify-content: center; width: 30px; border-radius: 9px; border: none; background: #fff7f2; color: #b9471f; cursor: pointer; opacity: 1; }
  .al-bloc-note-row-delete:hover { background: #fbe2df; color: #c23a2e; }
  .al-bloc-trash-link { flex-shrink: 0; border-top: 1px solid #f0ece2; color: #6b6f72; background: none; border-left: none; border-right: none; border-bottom: none; cursor: pointer; }
  .al-bloc-trash-link:hover { color: #c94f21; }
  .al-bloc-trash-count { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: #fbe7dd; color: #c94f21; font-size: 10.5px; font-weight: 700; }
  .al-bloc-trash-modal { background: rgba(17,17,17,0.35); }
  .al-bloc-trash-panel { background: white; box-shadow: 0 24px 60px rgba(17,17,17,0.18); }
  .al-bloc-trash-row { background: #faf8f4; border: 1px solid #f0ece2; }
  .al-bloc-trash-footer { border-top: 1px solid #f0ece2; color: #9a958a; }
  .al-bloc-save-dot { background: #4C9A6E; }
  .al-bloc-mobile-create { line-height: 1; }
  .al-bloc-mobile-notes { min-height: 50px; }
  .al-bloc-mobile-title-row { border-bottom: 1px solid #f0ece2; }
  .al-bloc-mobile-title-button { border: 0; background: transparent; }
  .al-bloc-mobile-actions { gap: 2px; border-top: 1px solid #f0ece2; background: white; }
  .al-bloc-mobile-action { display: flex; min-width: 0; flex: 1; align-items: center; justify-content: center; gap: 7px; height: 38px; border: 0; border-radius: 8px; background: transparent; color: #6b6f72; font-size: 12px; font-weight: 600; cursor: pointer; }
  .al-bloc-mobile-action:hover, .al-bloc-mobile-action[aria-expanded="true"] { background: #fff3ed; color: #b9471f; }
  .al-bloc-mobile-status { border-top: 1px solid #f0ece2; background: #faf8f4; }
  .al-bloc-mobile-card { min-height: 48px; border: 1px solid #ece7dc; background: white; color: #333029; }
  .al-bloc-mobile-card-active { border-color: var(--al-action-soft-border-hover); background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); box-shadow: 0 4px 12px rgba(80,43,27,0.05); }
  .al-bloc-mobile-card-meta { color: #9a958a; }
  .al-bloc-mobile-card-active .al-bloc-mobile-card-meta { color: #8f7468; }
  .al-bloc-mobile-card-delete { border: 0; background: #fff3ed; color: #b9471f; }
  .al-bloc-mobile-card-delete:hover { background: #fbe2df; color: #c23a2e; }
  .al-bloc-mobile-card-active .al-bloc-mobile-card-delete { background: #fff8f4; color: #b9471f; }
  .al-bloc-panel-label { display: block; margin: 0 0 6px; color: #6b6f72; font-size: 11px; font-weight: 700; line-height: 1.2; text-transform: uppercase; letter-spacing: 0.04em; }
  .al-bloc-panel-select { width: 100%; height: 42px; padding-right: 34px; padding-left: 12px; font-size: 14px; }
  .al-bloc-size-group-panel { width: 100%; justify-content: space-between; }
  .al-bloc-size-group-panel .al-bloc-tool-btn { width: 42px; height: 40px; }
  .al-bloc-size-group-panel .al-bloc-font-size-field { height: 40px; flex: 1; }
  .al-bloc-size-group-panel .al-bloc-font-size-field input { width: 46px; height: 38px; font-size: 14px; line-height: 38px; }
  .al-bloc-size-group-panel .al-bloc-font-size-field span { font-size: 10px; line-height: 40px; }
  .al-bloc-panel-alignment .al-bloc-tool-btn { width: 100%; height: 40px; border: 1px solid #ece7dc; background: white; }
  .al-bloc-panel-alignment .al-bloc-tool-btn-active { border-color: rgba(225, 93, 45, 0.28); background: #f7ded2; }
  .al-bloc-panel-color { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 8px; min-height: 44px; border: 1px solid #ece7dc; border-radius: 9px; padding: 7px 8px 7px 10px; color: #333029; font-size: 12px; font-weight: 600; }
  .al-bloc-panel-color > span { display: flex; min-width: 0; align-items: center; gap: 6px; }
  .al-bloc-panel-color input { width: 30px; height: 28px; flex-shrink: 0; cursor: pointer; border: 0; border-radius: 6px; padding: 0; background: transparent; }
  .al-bloc-sheet { background: white; border-top: 1px solid #ece7dc; box-shadow: 0 -12px 32px rgba(17,17,17,0.12); }
  .al-bloc-sheet-handle { background: #ece7dc; }
  .al-bloc-sheet-row { color: #333029; background: none; border: none; }
  .al-bloc-sheet-row:hover { background: #faf8f4; }
  .al-bloc-sheet-row-danger { color: #c23a2e; }
  .al-bloc-sheet-row-danger:hover { background: #fbe2df; }
  @media (max-width: 767px) {
    .al-bloc-page-header { margin-bottom: 0; gap: 0; }
    .al-bloc-page-header .al-page-header-subtitle { font-size: 12px; line-height: 1.35; }
    .al-bloc-mobile-layout { min-height: calc(100dvh - 190px); }
  }
  @media (min-width: 768px) {
    .al-bloc-desktop-grid { height: clamp(520px, calc(100dvh - 148px), 960px); }
    .al-bloc-editor-shell, .al-bloc-sidebar { height: 100%; }
  }
`;
