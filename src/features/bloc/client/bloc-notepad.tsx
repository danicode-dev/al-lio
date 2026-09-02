"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  createBlocNoteAction,
  deleteBlocNoteAction,
  fetchBlocNotes,
  migrateLocalBlocNotes,
  updateBlocNoteAction,
} from "@/features/bloc/server/actions";
import { countFavorites, dropPhantomNote, searchNotes, selectTabNotes } from "@/lib/bloc/note-selection";
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
import { downloadTextFile, exportActivePdf, exportActiveWord, sanitizeFilename, writeClipboardText } from "./bloc-export";
import { emptyListMessage, formatBlocEditedTime, formatBlocNoteCardDate, MobileNoteCard, MobileSheet, MobileSheetRow, TrashSheet, countWords } from "./bloc-note-list";
import { ExportMenu, NoteOverflowMenu, SlidersIcon } from "./bloc-note-menus";
import { createBlocNote, normalizeBlocNotes, normalizeBlocSettings, normalizeBlocTrashed, nowIso, safeJson } from "./bloc-persistence";
import { BLOC_STYLES } from "./bloc-styles";
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
          void updateBlocNoteAction({
            id: current.id,
            patch: { title: current.title, contentHtml: current.contentHtml, contentText: current.contentText },
          });
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
  const visibleNotes = useMemo(() => dropPhantomNote(notes, phantomId), [notes, phantomId]);
  const tabNotes = useMemo(() => selectTabNotes(visibleNotes, listTab), [visibleNotes, listTab]);
  const filteredNotes = useMemo(() => searchNotes(tabNotes, searchTerm), [tabNotes, searchTerm]);
  const favoritesCount = useMemo(() => countFavorites(visibleNotes), [visibleNotes]);

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
      void createBlocNoteAction({ id, title, contentHtml, contentText, favorite });
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
    if (!promoted && dbSyncEnabledRef.current) {
      void updateBlocNoteAction({ id, patch: { favorite: nextFavorite } });
    }
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
      void createBlocNoteAction({
        id: note.id,
        title: note.title,
        contentHtml: note.contentHtml,
        contentText: note.contentText,
        favorite: false,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      });
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
      void createBlocNoteAction({
        id: copy.id,
        title: copy.title,
        contentHtml: copy.contentHtml,
        contentText: copy.contentText,
        favorite: false,
        createdAt: copy.created_at,
        updatedAt: copy.updated_at,
      });
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
    if (dbSyncEnabledRef.current) {
      void updateBlocNoteAction({ id, patch: { deletedAt: nowIso() } });
    }
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
    if (dbSyncEnabledRef.current) {
      void updateBlocNoteAction({ id, patch: { deletedAt: null } });
    }
  }

  function purgeNote(id: string) {
    const target = trashedNotes.find((note) => note.id === id);
    if (!target) return;
    if (!window.confirm(`Eliminar definitivamente "${target.title || defaultTitle}"? No se puede deshacer.`)) return;
    setTrashedNotes((current) => current.filter((note) => note.id !== id));
    showNotice("Nota eliminada definitivamente");
    if (dbSyncEnabledRef.current) void deleteBlocNoteAction(id);
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
              onExportPdf={() => exportActivePdf({ note: activeNote, defaultTitle, exportingRef: exportingPdfRef, setExporting: setExportingPdf, showNotice })}
              onExportWord={() => exportActiveWord({ note: activeNote, defaultTitle, showNotice })}
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
              onExportPdf={() => exportActivePdf({ note: activeNote, defaultTitle, exportingRef: exportingPdfRef, setExporting: setExportingPdf, showNotice })}
              onExportWord={() => exportActiveWord({ note: activeNote, defaultTitle, showNotice })}
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

const blocBrandCss = BLOC_STYLES;
