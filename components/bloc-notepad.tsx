"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CalendarDays,
  CheckSquare,
  Clock,
  Copy,
  Download,
  FileText,
  Files,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  MoreVertical,
  Palette,
  Pencil,
  Plus,
  Redo2,
  RotateCcw,
  Search,
  Star,
  Trash2,
  Type,
  Underline,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { insertDb, updateDb, deleteDb } from "@/lib/db";
import { fetchBlocNotes, migrateLocalBlocNotes } from "@/lib/bloc/notes-actions";

type BlocNote = {
  id: string;
  title: string;
  contentHtml: string;
  contentText: string;
  favorite: boolean;
  created_at: string;
  updated_at: string;
};

type BlocTrashedNote = BlocNote & { deleted_at: string };

type BlocSettings = {
  fontSize: "sm" | "base" | "lg";
  defaultTitle: string;
};

const blocKey = "d1os:notepad:v1";
const legacyBlocKey = "techlife.bloc.D1OS.v1";
const blocSettingsKey = "d1os:notepad:settings:v1";
const legacyBlocSettingsKey = "techlife.bloc.settings.D1OS.v1";
const defaultTitle = "Documento sin titulo";
const maxImageBytes = 1_500_000;

type ListTab = "todas" | "recientes" | "favoritas";
type MobileSheetId = "format" | "insert" | "export" | "more" | "settings" | null;

export function BlocNotepad() {
  const [notes, setNotes] = useState<BlocNote[]>([]);
  const [trashedNotes, setTrashedNotes] = useState<BlocTrashedNote[]>([]);
  const [activeId, setActiveId] = useState("");
  const [settings, setSettings] = useState<BlocSettings>({ fontSize: "base", defaultTitle });
  const [searchTerm, setSearchTerm] = useState("");
  const [listTab, setListTab] = useState<ListTab>("todas");
  const [showSettings, setShowSettings] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [notice, setNotice] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<MobileSheetId>(null);
  const [menuNoteId, setMenuNoteId] = useState<string | null>(null);
  const [titleEditing, setTitleEditing] = useState(false);
  const notesRef = useRef<BlocNote[]>([]);
  const trashedRef = useRef<BlocTrashedNote[]>([]);
  const activeIdRef = useRef("");
  const dbSyncEnabledRef = useRef(false);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

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
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!mobileSheet && !menuNoteId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileSheet(null);
        setMenuNoteId(null);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileSheet, menuNoteId]);

  const attachEditor = useCallback((node: HTMLDivElement | null) => {
    editorRef.current = node;
    if (node) {
      const active = notesRef.current.find((note) => note.id === activeIdRef.current);
      node.innerHTML = active?.contentHtml ?? "";
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(blocKey) ?? localStorage.getItem(legacyBlocKey);
    const rawSettings = localStorage.getItem(blocSettingsKey) ?? localStorage.getItem(legacyBlocSettingsKey);
    const parsed = raw ? safeJson(raw) : null;
    const savedNotes = normalizeBlocNotes(parsed);
    const savedTrash = normalizeBlocTrashed(parsed);
    const initialNotes = savedNotes.length ? savedNotes : [createBlocNote({ title: defaultTitle })];

    setSettings(normalizeBlocSettings(rawSettings ? safeJson(rawSettings) : null));
    setNotes(initialNotes);
    setTrashedNotes(savedTrash);
    setActiveId(initialNotes[0].id);
    setLoaded(true);
  }, []);

  // Sincroniza con la base de datos: si el usuario ya tiene notas guardadas
  // en el servidor, esas mandan. Si no tiene ninguna todavia, sube lo que
  // haya en localStorage una sola vez. Si algo falla (sin conexion, etc.)
  // la app se queda funcionando solo con localStorage, como hasta ahora.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let result = await fetchBlocNotes();
        if (cancelled) return;
        if (!result.migrated) {
          result = await migrateLocalBlocNotes(notesRef.current, trashedRef.current);
          if (cancelled) return;
        }
        const nextNotes = result.notes.length ? result.notes : [createBlocNote({ title: defaultTitle })];
        setNotes(nextNotes);
        setTrashedNotes(result.trashedNotes);
        setActiveId((current) => (nextNotes.some((note) => note.id === current) ? current : nextNotes[0].id));
        dbSyncEnabledRef.current = true;
      } catch {
        // Sin conexion a la base de datos: seguimos con localStorage solamente.
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
  }, [activeId, loaded]);

  useEffect(() => {
    if (!notice) return;
    const timeoutId = window.setTimeout(() => setNotice(""), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const activeNote = useMemo(() => notes.find((note) => note.id === activeId) ?? null, [activeId, notes]);

  const tabNotes = useMemo(() => {
    if (listTab === "favoritas") return notes.filter((note) => note.favorite);
    if (listTab === "recientes") return [...notes].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return notes;
  }, [notes, listTab]);

  const filteredNotes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return tabNotes;
    return tabNotes.filter((note) => `${note.title} ${note.contentText}`.toLowerCase().includes(query));
  }, [tabNotes, searchTerm]);

  const favoritesCount = useMemo(() => notes.filter((note) => note.favorite).length, [notes]);

  const fontClass = { sm: "text-sm", base: "text-base", lg: "text-lg" }[settings.fontSize];
  const wordCount = countWords(activeNote?.contentText ?? "");
  const charCount = activeNote?.contentText.length ?? 0;

  function persistSettings(next: BlocSettings) {
    setSettings(next);
    localStorage.setItem(blocSettingsKey, JSON.stringify(next));
  }

  function renameActiveNote(title: string) {
    if (!activeNote) return;
    const updatedAt = nowIso();
    setNotes((current) => current.map((note) => (note.id === activeNote.id ? { ...note, title, updated_at: updatedAt } : note)));
  }

  function toggleFavorite(id: string) {
    const target = notes.find((note) => note.id === id);
    if (!target) return;
    const nextFavorite = !target.favorite;
    setNotes((current) => current.map((note) => (note.id === id ? { ...note, favorite: nextFavorite } : note)));
    if (dbSyncEnabledRef.current) void updateDb("bloc_notes", id, { is_favorite: nextFavorite }, []);
  }

  function recordEditorContent() {
    if (!activeNote || !editorRef.current) return;
    const rawText = getEditorText(editorRef.current);
    if (rawText.trim().length === 0) editorRef.current.innerHTML = "";

    const updatedAt = nowIso();
    const contentHtml = sanitizeEditorHtml(editorRef.current.innerHTML);
    const contentText = rawText.trim().length === 0 ? "" : rawText;

    setNotes((current) =>
      current.map((note) =>
        note.id === activeNote.id
          ? { ...note, contentHtml, contentText, updated_at: updatedAt }
          : note,
      ),
    );
  }

  function focusEditor() {
    editorRef.current?.focus();
  }

  function runEditorCommand(command: string, value?: string) {
    focusEditor();
    document.execCommand(command, false, value);
    recordEditorContent();
  }

  function createNote() {
    const note = createBlocNote({ title: settings.defaultTitle.trim() || defaultTitle });
    setNotes((current) => [note, ...current]);
    setActiveId(note.id);
    setSearchTerm("");
    setListTab("todas");
    setNotice("Nota creada");
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
    setNotice("Nota duplicada");
    if (dbSyncEnabledRef.current) {
      void insertDb("bloc_notes", { id: copy.id, title: copy.title, content_html: copy.contentHtml, content_text: copy.contentText, is_favorite: false, deleted_at: null }, []);
    }
  }

  function deleteNote(id: string) {
    const target = notes.find((note) => note.id === id);
    if (!target) return;

    const next = notes.filter((note) => note.id !== id);
    setTrashedNotes((current) => [{ ...target, deleted_at: nowIso() }, ...current]);

    if (next.length === 0) {
      const fresh = createBlocNote({ title: defaultTitle });
      setNotes([fresh]);
      setActiveId(fresh.id);
    } else {
      setNotes(next);
      if (activeId === id) setActiveId(next[0].id);
    }
    setNotice("Nota movida a la papelera");
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
    setNotice("Nota restaurada");
    if (dbSyncEnabledRef.current) void updateDb("bloc_notes", id, { deleted_at: null }, []);
  }

  function purgeNote(id: string) {
    const target = trashedNotes.find((note) => note.id === id);
    if (!target) return;
    if (!window.confirm(`Eliminar definitivamente "${target.title || defaultTitle}"? No se puede deshacer.`)) return;
    setTrashedNotes((current) => current.filter((note) => note.id !== id));
    setNotice("Nota eliminada definitivamente");
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

  function setParagraphBlock(value: string) {
    if (!value) return;
    focusEditor();
    document.execCommand("formatBlock", false, value);
    recordEditorContent();
  }

  function insertItem(value: string) {
    if (!value) return;
    focusEditor();

    if (value === "date") {
      document.execCommand("insertText", false, new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date()));
    }
    if (value === "time") {
      document.execCommand("insertText", false, new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(new Date()));
    }
    if (value === "divider") {
      document.execCommand("insertHorizontalRule");
    }
    if (value === "check") {
      document.execCommand("insertText", false, "[ ] ");
    }

    recordEditorContent();
  }

  function createLink() {
    const value = window.prompt("URL del enlace");
    if (!value) return;
    const trimmed = value.trim();
    const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    runEditorCommand("createLink", url);
  }

  async function copyActiveNote() {
    if (!activeNote) return;
    await writeClipboardText(activeNote.contentText);
    setNotice("Texto copiado");
  }

  function downloadActiveNote() {
    if (!activeNote) return;
    downloadTextFile(`${sanitizeFilename(activeNote.title || "nota")}.txt`, activeNote.contentText);
    setNotice("Descarga preparada");
  }

  function exportActivePdf() {
    if (!activeNote) return;
    downloadPdfFile(`${sanitizeFilename(activeNote.title || "nota")}.pdf`, activeNote.title || defaultTitle, activeNote.contentText);
    setNotice("PDF exportado");
  }

  function exportActiveWord() {
    if (!activeNote) return;
    downloadWordFile(`${sanitizeFilename(activeNote.title || "nota")}.doc`, activeNote.title || defaultTitle, activeNote.contentHtml || textToHtml(activeNote.contentText));
    setNotice("Word exportado");
  }

  function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (!/\.(txt|md)$/i.test(file.name)) {
      setNotice("Solo TXT o MD");
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const title = file.name.replace(/\.(txt|md)$/i, "") || "Documento importado";
      const note = createBlocNote({ title, contentHtml: textToHtml(text), contentText: text });
      setNotes((current) => [note, ...current]);
      setActiveId(note.id);
      setSearchTerm("");
      setNotice("Documento subido");
      input.value = "";
      if (dbSyncEnabledRef.current) {
        void insertDb("bloc_notes", { id: note.id, title: note.title, content_html: note.contentHtml, content_text: note.contentText, is_favorite: false, deleted_at: null }, []);
      }
    };
    reader.readAsText(file);
  }

  function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNotice("Solo imágenes");
      input.value = "";
      return;
    }
    if (file.size > maxImageBytes) {
      setNotice("Imagen demasiado grande (máx 1.5MB)");
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      if (dataUrl) runEditorCommand("insertImage", dataUrl);
      input.value = "";
    };
    reader.readAsDataURL(file);
  }

  if (!loaded) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Cargando notas...
      </div>
    );
  }

  if (isMobile) {
    const menuNote = menuNoteId ? notes.find((note) => note.id === menuNoteId) ?? null : null;

    return (
      <div className="relative">
        <style>{blocBrandCss}</style>
        <div className="flex items-center gap-2">
          <div className="al-bloc-search relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a958a]" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar notas..."
              className="h-11 rounded-xl pl-9"
            />
          </div>
          <button type="button" className="al-bloc-icon-btn h-11 w-11 rounded-xl" onClick={() => setMobileSheet("settings")} aria-label="Ajustes del bloc">
            <MoreVertical className="h-4 w-4" />
          </button>
          <button type="button" className="al-bloc-primary-btn h-11 w-11 rounded-xl px-0" onClick={createNote} aria-label="Nueva nota">
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
          {filteredNotes.map((note) => (
            <MobileNoteCard
              key={note.id}
              note={note}
              active={note.id === activeId}
              onSelect={() => { setActiveId(note.id); setTitleEditing(false); }}
              onMenu={() => setMenuNoteId(note.id)}
            />
          ))}
          {filteredNotes.length === 0 && (
            <div className="w-full rounded-xl border border-dashed p-4 text-center text-sm text-[#6b6f72]">
              No hay notas con esa búsqueda.
            </div>
          )}
        </div>

        <section className="al-bloc-editor-shell mt-3 overflow-hidden rounded-2xl">
          <div className="flex items-start justify-between gap-2 px-4 pt-4">
            {titleEditing ? (
              <Input
                autoFocus
                value={activeNote?.title ?? ""}
                onChange={(event) => renameActiveNote(event.target.value)}
                onBlur={() => setTitleEditing(false)}
                onKeyDown={(event) => event.key === "Enter" && setTitleEditing(false)}
                placeholder={defaultTitle}
                className="h-10 flex-1 text-lg font-bold"
              />
            ) : (
              <div className="flex min-w-0 items-center gap-1">
                <h2 className="truncate text-2xl font-bold leading-tight text-[#111111]">{activeNote?.title || defaultTitle}</h2>
                <button type="button" className="al-bloc-icon-btn-ghost flex h-11 w-11 shrink-0 items-center justify-center" onClick={() => setTitleEditing(true)} aria-label="Editar título">
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
            <button
              type="button"
              className="al-bloc-icon-btn-ghost mt-1 flex h-9 w-9 shrink-0 items-center justify-center"
              onClick={() => activeNote && toggleFavorite(activeNote.id)}
              aria-label="Favorita"
            >
              <Star className={cn("h-4.5 w-4.5", activeNote?.favorite && "al-bloc-star-active")} fill={activeNote?.favorite ? "currentColor" : "none"} />
            </button>
          </div>

          <div
            ref={attachEditor}
            role="textbox"
            aria-label="Editor de nota"
            aria-multiline="true"
            contentEditable
            suppressContentEditableWarning
            spellCheck
            data-placeholder="Empieza a escribir..."
            onInput={recordEditorContent}
            onBlur={recordEditorContent}
            onPaste={handlePaste}
            onKeyDown={handleEditorKeyDown}
            className={cn(
              "al-bloc-content empty:before:pointer-events-none empty:before:text-[#9a958a] empty:before:content-[attr(data-placeholder)]",
              "min-h-[45dvh] max-h-[58dvh] overflow-y-auto px-4 py-4 leading-7 outline-none",
              fontClass,
            )}
          />

          <div className="al-bloc-mobile-toolbar flex items-stretch">
            <MobileToolbarButton label="Formato" onClick={() => setMobileSheet("format")}>
              <Type className="h-4 w-4" />
            </MobileToolbarButton>
            <MobileToolbarButton label="Insertar" onClick={() => setMobileSheet("insert")}>
              <Plus className="h-4 w-4" />
            </MobileToolbarButton>
            <MobileToolbarButton label="Exportar" onClick={() => setMobileSheet("export")}>
              <Download className="h-4 w-4" />
            </MobileToolbarButton>
            <button type="button" className="al-bloc-mobile-toolbar-more flex w-14 items-center justify-center" onClick={() => setMobileSheet("more")} aria-label="Más opciones">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </section>

        <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 text-center text-xs text-[#6b6f72]">
          <span className="al-bloc-save-dot inline-block h-2 w-2 rounded-full" />
          <span>{saveState === "saving" ? "Guardando..." : "Guardado automáticamente"}</span>
          <span>· Última edición: {activeNote ? formatBlocEditedTime(activeNote.updated_at) : "--:--"}</span>
          <span>· {wordCount} palabras</span>
          {notice && <span className="font-semibold text-[#c94f21]">· {notice}</span>}
        </p>

        <input ref={uploadInputRef} type="file" accept=".txt,.md,text/plain,text/markdown" className="hidden" onChange={handleUpload} />
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

        {mobileSheet === "format" && (
          <MobileSheet title="Formato" onClose={() => setMobileSheet(null)}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#9a958a]">Estilo de texto</p>
            <div className="grid grid-cols-3 gap-2">
              <MobileSheetTile label="Negrita" onClick={() => runEditorCommand("bold")}><Bold className="h-4 w-4" /></MobileSheetTile>
              <MobileSheetTile label="Cursiva" onClick={() => runEditorCommand("italic")}><Italic className="h-4 w-4" /></MobileSheetTile>
              <MobileSheetTile label="Subrayado" onClick={() => runEditorCommand("underline")}><Underline className="h-4 w-4" /></MobileSheetTile>
              <MobileSheetTile label="Lista" onClick={() => runEditorCommand("insertUnorderedList")}><List className="h-4 w-4" /></MobileSheetTile>
              <MobileSheetTile label="Numerada" onClick={() => runEditorCommand("insertOrderedList")}><ListOrdered className="h-4 w-4" /></MobileSheetTile>
              <MobileSheetTile label="Enlace" onClick={createLink}><Link2 className="h-4 w-4" /></MobileSheetTile>
            </div>
            <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-[#9a958a]">Estilo de párrafo</p>
            <div className="grid grid-cols-3 gap-2">
              <MobileSheetTile label="Normal" onClick={() => setParagraphBlock("P")}><span className="text-sm font-semibold">P</span></MobileSheetTile>
              <MobileSheetTile label="Título 1" onClick={() => setParagraphBlock("H1")}><span className="text-sm font-semibold">H1</span></MobileSheetTile>
              <MobileSheetTile label="Título 2" onClick={() => setParagraphBlock("H2")}><span className="text-sm font-semibold">H2</span></MobileSheetTile>
              <MobileSheetTile label="Título 3" onClick={() => setParagraphBlock("H3")}><span className="text-sm font-semibold">H3</span></MobileSheetTile>
              <MobileSheetTile label="Cita" onClick={() => setParagraphBlock("BLOCKQUOTE")}><span className="text-sm font-semibold">&ldquo;&rdquo;</span></MobileSheetTile>
            </div>
            <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-[#9a958a]">Alineación</p>
            <div className="grid grid-cols-4 gap-2">
              <MobileSheetTile label="Izquierda" onClick={() => runEditorCommand("justifyLeft")}><AlignLeft className="h-4 w-4" /></MobileSheetTile>
              <MobileSheetTile label="Centro" onClick={() => runEditorCommand("justifyCenter")}><AlignCenter className="h-4 w-4" /></MobileSheetTile>
              <MobileSheetTile label="Derecha" onClick={() => runEditorCommand("justifyRight")}><AlignRight className="h-4 w-4" /></MobileSheetTile>
              <MobileSheetTile label="Justificar" onClick={() => runEditorCommand("justifyFull")}><AlignJustify className="h-4 w-4" /></MobileSheetTile>
            </div>
            <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-[#9a958a]">Tamaño del editor</p>
            <div className="grid grid-cols-3 gap-2">
              {(["sm", "base", "lg"] as const).map((fontSize) => (
                <button
                  key={fontSize}
                  type="button"
                  className={cn("al-bloc-size-btn h-11 rounded-xl", settings.fontSize === fontSize && "al-bloc-size-btn-active")}
                  onClick={() => persistSettings({ ...settings, fontSize })}
                >
                  {fontSize === "sm" ? "S" : fontSize === "base" ? "M" : "L"}
                </button>
              ))}
            </div>
          </MobileSheet>
        )}

        {mobileSheet === "insert" && (
          <MobileSheet title="Insertar" onClose={() => setMobileSheet(null)}>
            <div className="space-y-1">
              <MobileSheetRow label="Fecha" onClick={() => { insertItem("date"); setMobileSheet(null); }}><CalendarDays className="h-4 w-4" /></MobileSheetRow>
              <MobileSheetRow label="Hora" onClick={() => { insertItem("time"); setMobileSheet(null); }}><Clock className="h-4 w-4" /></MobileSheetRow>
              <MobileSheetRow label="Separador" onClick={() => { insertItem("divider"); setMobileSheet(null); }}><Minus className="h-4 w-4" /></MobileSheetRow>
              <MobileSheetRow label="Checklist" onClick={() => { insertItem("check"); setMobileSheet(null); }}><CheckSquare className="h-4 w-4" /></MobileSheetRow>
              <MobileSheetRow label="Enlace" onClick={() => { setMobileSheet(null); createLink(); }}><Link2 className="h-4 w-4" /></MobileSheetRow>
              <MobileSheetRow label="Imagen" onClick={() => { setMobileSheet(null); imageInputRef.current?.click(); }}><ImageIcon className="h-4 w-4" /></MobileSheetRow>
              <MobileSheetRow label="Subir documento (TXT/MD)" onClick={() => { setMobileSheet(null); uploadInputRef.current?.click(); }}><Upload className="h-4 w-4" /></MobileSheetRow>
            </div>
          </MobileSheet>
        )}

        {mobileSheet === "export" && (
          <MobileSheet title="Exportar" onClose={() => setMobileSheet(null)}>
            <div className="space-y-1">
              <MobileSheetRow label="Exportar PDF" onClick={() => { exportActivePdf(); setMobileSheet(null); }}><FileText className="h-4 w-4" /></MobileSheetRow>
              <MobileSheetRow label="Exportar Word" onClick={() => { exportActiveWord(); setMobileSheet(null); }}><FileText className="h-4 w-4" /></MobileSheetRow>
              <MobileSheetRow label="Descargar TXT" onClick={() => { downloadActiveNote(); setMobileSheet(null); }}><Download className="h-4 w-4" /></MobileSheetRow>
              <MobileSheetRow label="Copiar texto" onClick={() => { void copyActiveNote(); setMobileSheet(null); }}><Copy className="h-4 w-4" /></MobileSheetRow>
            </div>
          </MobileSheet>
        )}

        {mobileSheet === "more" && (
          <MobileSheet title="Más opciones" onClose={() => setMobileSheet(null)}>
            <div className="space-y-1">
              <MobileSheetRow label="Renombrar nota" onClick={() => { setMobileSheet(null); setTitleEditing(true); }}><Pencil className="h-4 w-4" /></MobileSheetRow>
              <MobileSheetRow label="Duplicar nota" onClick={() => { duplicateNote(); setMobileSheet(null); }}><Files className="h-4 w-4" /></MobileSheetRow>
              <MobileSheetRow label="Copiar texto" onClick={() => { void copyActiveNote(); setMobileSheet(null); }}><Copy className="h-4 w-4" /></MobileSheetRow>
              <MobileSheetRow label="Exportar PDF" onClick={() => { exportActivePdf(); setMobileSheet(null); }}><FileText className="h-4 w-4" /></MobileSheetRow>
              <MobileSheetRow label="Exportar Word" onClick={() => { exportActiveWord(); setMobileSheet(null); }}><FileText className="h-4 w-4" /></MobileSheetRow>
              <MobileSheetRow label="Papelera" onClick={() => { setMobileSheet(null); setShowTrash(true); }}><Trash2 className="h-4 w-4" /></MobileSheetRow>
              <MobileSheetRow label="Ajustes" onClick={() => setMobileSheet("settings")}><SlidersIcon /></MobileSheetRow>
              <MobileSheetRow
                label="Eliminar nota"
                destructive
                onClick={() => { if (activeNote) deleteNote(activeNote.id); setMobileSheet(null); }}
              >
                <Trash2 className="h-4 w-4" />
              </MobileSheetRow>
            </div>
          </MobileSheet>
        )}

        {mobileSheet === "settings" && (
          <MobileSheet title="Ajustes" onClose={() => setMobileSheet(null)}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#9a958a]">Tamaño del editor</p>
            <div className="grid grid-cols-3 gap-2">
              {(["sm", "base", "lg"] as const).map((fontSize) => (
                <button
                  key={fontSize}
                  type="button"
                  className={cn("al-bloc-size-btn h-11 rounded-xl", settings.fontSize === fontSize && "al-bloc-size-btn-active")}
                  onClick={() => persistSettings({ ...settings, fontSize })}
                >
                  {fontSize === "sm" ? "S" : fontSize === "base" ? "M" : "L"}
                </button>
              ))}
            </div>
            <p className="mb-1.5 mt-4 text-xs font-medium uppercase tracking-wide text-[#9a958a]">Título por defecto</p>
            <Input
              value={settings.defaultTitle}
              onChange={(event) => persistSettings({ ...settings, defaultTitle: event.target.value })}
              placeholder={defaultTitle}
              className="h-11"
            />
          </MobileSheet>
        )}

        {menuNote && (
          <MobileSheet title={menuNote.title || defaultTitle} onClose={() => setMenuNoteId(null)}>
            <div className="space-y-1">
              <MobileSheetRow label="Abrir" onClick={() => { setActiveId(menuNote.id); setTitleEditing(false); setMenuNoteId(null); }}><FileText className="h-4 w-4" /></MobileSheetRow>
              <MobileSheetRow label="Renombrar" onClick={() => { setActiveId(menuNote.id); setTitleEditing(true); setMenuNoteId(null); }}><Pencil className="h-4 w-4" /></MobileSheetRow>
              <MobileSheetRow label="Duplicar" onClick={() => { duplicateNote(menuNote); setMenuNoteId(null); }}><Files className="h-4 w-4" /></MobileSheetRow>
              <MobileSheetRow label={menuNote.favorite ? "Quitar de favoritas" : "Marcar favorita"} onClick={() => { toggleFavorite(menuNote.id); setMenuNoteId(null); }}>
                <Star className="h-4 w-4" fill={menuNote.favorite ? "currentColor" : "none"} />
              </MobileSheetRow>
              <MobileSheetRow
                label="Eliminar"
                destructive
                onClick={() => { deleteNote(menuNote.id); setMenuNoteId(null); }}
              >
                <Trash2 className="h-4 w-4" />
              </MobileSheetRow>
            </div>
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
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="al-bloc-editor-shell min-w-0 overflow-hidden rounded-2xl">
          <div className="al-bloc-title-row flex items-center gap-2 px-5 py-4">
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
          </div>

          <BlocEditorToolbar
            onCommand={runEditorCommand}
            onBlockChange={setParagraphBlock}
            onColor={(color) => runEditorCommand("foreColor", color)}
            onHighlight={(color) => runEditorCommand("backColor", color)}
            onInsert={insertItem}
            onLink={createLink}
            onImageClick={() => imageInputRef.current?.click()}
            onDownload={downloadActiveNote}
            showMore={showMoreTools}
            onToggleMore={() => setShowMoreTools((value) => !value)}
          />

          <div className="al-bloc-content-wrap">
            {wordCount === 0 && (
              <Image
                src="/assets/bloc/bloc-empty-illustration.png"
                alt=""
                width={480}
                height={343}
                className="al-bloc-content-watermark"
              />
            )}
            <div
              ref={attachEditor}
              role="textbox"
              aria-label="Editor de nota"
              aria-multiline="true"
              contentEditable
              suppressContentEditableWarning
              spellCheck
              data-placeholder="Empieza a escribir, presiona '/' para comandos..."
              onInput={recordEditorContent}
              onBlur={recordEditorContent}
              onPaste={handlePaste}
              onKeyDown={handleEditorKeyDown}
              className={cn(
                "al-bloc-content empty:before:pointer-events-none empty:before:text-[#9a958a] empty:before:content-[attr(data-placeholder)]",
                "min-h-[430px] max-h-[62vh] overflow-y-auto px-8 py-6 leading-7 outline-none",
                fontClass,
              )}
            />
          </div>

          <div className="al-bloc-footer flex flex-col gap-3 px-4 py-3 text-xs lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <span className="al-bloc-save-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" />
              <span>{saveState === "saving" ? "Guardando..." : "Guardado automáticamente"}</span>
              <span> · Última edición: {activeNote ? formatBlocEditedTime(activeNote.updated_at) : "--:--"}</span>
              {notice && <span className="ml-2 font-semibold text-[#c94f21]">{notice}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              <span>Palabras: {wordCount}</span>
              <span>Caracteres: {charCount}</span>
              <div className="ml-0 flex items-center gap-1 sm:ml-2">
                <Select
                  defaultValue=""
                  className="al-bloc-export-select h-8 w-[100px] text-xs"
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "pdf") exportActivePdf();
                    if (value === "word") exportActiveWord();
                    if (value === "txt") downloadActiveNote();
                    event.currentTarget.value = "";
                  }}
                >
                  <option value="">Exportar</option>
                  <option value="pdf">PDF</option>
                  <option value="word">Word</option>
                  <option value="txt">TXT</option>
                </Select>
                <button type="button" className="al-bloc-icon-btn-ghost flex h-8 w-8 items-center justify-center" onClick={() => duplicateNote()} aria-label="Duplicar nota" title="Duplicar nota">
                  <Files className="h-4 w-4" />
                </button>
                <button type="button" className="al-bloc-icon-btn-ghost flex h-8 w-8 items-center justify-center" onClick={copyActiveNote} aria-label="Copiar texto" title="Copiar texto">
                  <Copy className="h-4 w-4" />
                </button>
                <button type="button" className="al-bloc-icon-btn-ghost al-bloc-icon-btn-danger flex h-8 w-8 items-center justify-center" onClick={() => activeNote && deleteNote(activeNote.id)} aria-label="Eliminar nota" title="Eliminar nota">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
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
            <div className="al-bloc-settings-panel mt-3 space-y-3">
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#9a958a]">Tamaño del editor</p>
                <div className="grid grid-cols-3 gap-1">
                  {(["sm", "base", "lg"] as const).map((fontSize) => (
                    <button
                      key={fontSize}
                      type="button"
                      className={cn("al-bloc-size-btn h-7 rounded-md text-xs", settings.fontSize === fontSize && "al-bloc-size-btn-active")}
                      onClick={() => persistSettings({ ...settings, fontSize })}
                    >
                      {fontSize === "sm" ? "S" : fontSize === "base" ? "M" : "L"}
                    </button>
                  ))}
                </div>
              </div>
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
                <p>{listTab === "favoritas" ? "Aún no tienes notas favoritas." : "No hay notas con esa búsqueda."}</p>
              </div>
            )}
          </div>

          <button type="button" className="al-bloc-trash-link mt-3 flex items-center justify-between border-t pt-3 text-xs font-semibold" onClick={() => setShowTrash(true)}>
            <span className="flex items-center gap-1.5"><Trash2 className="h-3.5 w-3.5" />Ver papelera</span>
            {trashedNotes.length > 0 && <span className="al-bloc-trash-count">{trashedNotes.length}</span>}
          </button>
        </aside>
      </div>

      <input ref={uploadInputRef} type="file" accept=".txt,.md,text/plain,text/markdown" className="hidden" onChange={handleUpload} />
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      {showTrash && (
        <TrashSheet trashedNotes={trashedNotes} onClose={() => setShowTrash(false)} onRestore={restoreNote} onPurge={purgeNote} />
      )}
    </div>
  );
}

function SlidersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="21" x2="14" y1="4" y2="4" />
      <line x1="10" x2="3" y1="4" y2="4" />
      <line x1="21" x2="12" y1="12" y2="12" />
      <line x1="8" x2="3" y1="12" y2="12" />
      <line x1="21" x2="16" y1="20" y2="20" />
      <line x1="12" x2="3" y1="20" y2="20" />
      <line x1="14" x2="14" y1="2" y2="6" />
      <line x1="8" x2="8" y1="10" y2="14" />
      <line x1="16" x2="16" y1="18" y2="22" />
    </svg>
  );
}

function BlocEditorToolbar({
  onCommand,
  onBlockChange,
  onColor,
  onHighlight,
  onInsert,
  onLink,
  onImageClick,
  onDownload,
  showMore,
  onToggleMore,
}: {
  onCommand: (command: string, value?: string) => void;
  onBlockChange: (value: string) => void;
  onColor: (value: string) => void;
  onHighlight: (value: string) => void;
  onInsert: (value: string) => void;
  onLink: () => void;
  onImageClick: () => void;
  onDownload: () => void;
  showMore: boolean;
  onToggleMore: () => void;
}) {
  return (
    <div className="al-bloc-toolbar">
      <div className="flex flex-wrap items-center gap-1 px-2 py-2">
        <BlocToolButton label="Deshacer" onClick={() => onCommand("undo")}><Undo2 className="h-4 w-4" /></BlocToolButton>
        <BlocToolButton label="Rehacer" onClick={() => onCommand("redo")}><Redo2 className="h-4 w-4" /></BlocToolButton>
        <span className="al-bloc-toolbar-divider" />
        <Select defaultValue="Inter" className="al-bloc-toolbar-select h-8 w-[104px] text-xs" onChange={(event) => onCommand("fontName", event.target.value)}>
          <option value="Inter">Inter</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times</option>
          <option value="Courier New">Mono</option>
        </Select>
        <div className="al-bloc-size-group">
          <BlocToolButton label="Reducir tamaño" onClick={() => onCommand("fontSize", "2")}><Type className="h-3 w-3" /></BlocToolButton>
          <BlocToolButton label="Aumentar tamaño" onClick={() => onCommand("fontSize", "5")}><Type className="h-4 w-4" /></BlocToolButton>
        </div>
        <span className="al-bloc-toolbar-divider" />
        <BlocToolButton label="Negrita" onClick={() => onCommand("bold")}><Bold className="h-4 w-4" /></BlocToolButton>
        <BlocToolButton label="Cursiva" onClick={() => onCommand("italic")}><Italic className="h-4 w-4" /></BlocToolButton>
        <BlocToolButton label="Subrayado" onClick={() => onCommand("underline")}><Underline className="h-4 w-4" /></BlocToolButton>
        <span className="al-bloc-toolbar-divider" />
        <BlocToolButton label="Alinear izquierda" onClick={() => onCommand("justifyLeft")}><AlignLeft className="h-4 w-4" /></BlocToolButton>
        <BlocToolButton label="Alinear centro" onClick={() => onCommand("justifyCenter")}><AlignCenter className="h-4 w-4" /></BlocToolButton>
        <BlocToolButton label="Alinear derecha" onClick={() => onCommand("justifyRight")}><AlignRight className="h-4 w-4" /></BlocToolButton>
        <BlocToolButton label="Lista" onClick={() => onCommand("insertUnorderedList")}><List className="h-4 w-4" /></BlocToolButton>
        <span className="al-bloc-toolbar-divider" />
        <Select defaultValue="" className="al-bloc-toolbar-select h-8 w-[100px] text-xs" onChange={(event) => { onInsert(event.target.value); event.currentTarget.value = ""; }}>
          <option value="">Insertar</option>
          <option value="date">Fecha</option>
          <option value="time">Hora</option>
          <option value="divider">Separador</option>
          <option value="check">Checklist</option>
        </Select>
        <BlocToolButton label="Enlace" onClick={onLink}><Link2 className="h-4 w-4" /></BlocToolButton>
        <BlocToolButton label="Imagen" onClick={onImageClick}><ImageIcon className="h-4 w-4" /></BlocToolButton>
        <BlocToolButton label="Descargar TXT" onClick={onDownload}><Download className="h-4 w-4" /></BlocToolButton>
        <span className="al-bloc-toolbar-divider" />
        <BlocToolButton label="Más herramientas" onClick={onToggleMore}><MoreVertical className="h-4 w-4" /></BlocToolButton>
      </div>
      {showMore && (
        <div className="al-bloc-toolbar-more flex flex-wrap items-center gap-1 px-2 pb-2">
          <Select defaultValue="P" className="al-bloc-toolbar-select h-8 w-[104px] text-xs" onChange={(event) => onBlockChange(event.target.value)}>
            <option value="P">Normal</option>
            <option value="H1">Título 1</option>
            <option value="H2">Título 2</option>
            <option value="H3">Título 3</option>
            <option value="BLOCKQUOTE">Cita</option>
          </Select>
          <BlocToolButton label="Lista numerada" onClick={() => onCommand("insertOrderedList")}><ListOrdered className="h-4 w-4" /></BlocToolButton>
          <BlocToolButton label="Justificar" onClick={() => onCommand("justifyFull")}><AlignJustify className="h-4 w-4" /></BlocToolButton>
          <label className="al-bloc-tool-btn inline-flex h-8 w-8 cursor-pointer items-center justify-center" title="Color de texto" aria-label="Color de texto">
            <Palette className="h-4 w-4" />
            <input type="color" className="sr-only" onChange={(event) => onColor(event.target.value)} />
          </label>
          <label className="al-bloc-tool-btn inline-flex h-8 w-8 cursor-pointer items-center justify-center" title="Resaltar" aria-label="Resaltar">
            <Highlighter className="h-4 w-4" />
            <input type="color" className="sr-only" defaultValue="#fff3a3" onChange={(event) => onHighlight(event.target.value)} />
          </label>
        </div>
      )}
    </div>
  );
}

function BlocToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="al-bloc-tool-btn" onClick={onClick} aria-label={label} title={label}>
      {children}
    </button>
  );
}

function MobileNoteCard({
  note,
  active,
  onSelect,
  onMenu,
}: {
  note: BlocNote;
  active: boolean;
  onSelect: () => void;
  onMenu: () => void;
}) {
  return (
    <div className={cn("al-bloc-mobile-card relative w-36 shrink-0 snap-start rounded-2xl p-3", active && "al-bloc-mobile-card-active")}>
      <button type="button" className="block w-full text-left" onClick={onSelect}>
        <div className="flex items-center justify-between">
          <FileText className="h-5 w-5" />
          {note.favorite && <Star className="h-3.5 w-3.5" fill="currentColor" />}
        </div>
        <span className="mt-2 block truncate text-sm font-semibold">{note.title || defaultTitle}</span>
        <span className="al-bloc-mobile-card-meta mt-0.5 block text-xs">{countWords(note.contentText)} palabras</span>
        <span className="al-bloc-mobile-card-meta block text-xs">{formatBlocNoteCardDate(note.updated_at)}</span>
      </button>
      <button type="button" className="al-bloc-mobile-card-menu absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full" onClick={(event) => { event.stopPropagation(); onMenu(); }} aria-label={`Opciones de ${note.title || defaultTitle}`}>
        <MoreVertical className="h-4 w-4" />
      </button>
    </div>
  );
}

function MobileToolbarButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="al-bloc-mobile-toolbar-btn flex h-12 flex-1 items-center justify-center gap-2 text-sm font-medium" onClick={onClick} aria-label={label}>
      {children}
      {label}
    </button>
  );
}

function MobileSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={title} className="al-bloc-sheet fixed inset-x-0 bottom-0 z-[71] max-h-[80dvh] overflow-y-auto rounded-t-2xl pb-safe">
        <div className="al-bloc-sheet-handle mx-auto mt-3 h-1 w-10 rounded-full" />
        <div className="flex items-center justify-between px-5 py-3">
          <h3 className="truncate text-base font-semibold text-[#111111]">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="al-bloc-icon-btn-ghost flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 pb-6">{children}</div>
      </div>
    </>
  );
}

function MobileSheetRow({
  label,
  onClick,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={cn("al-bloc-sheet-row flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium", destructive && "al-bloc-sheet-row-danger")} onClick={onClick}>
      {children}
      {label}
    </button>
  );
}

function MobileSheetTile({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="al-bloc-sheet-tile flex h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium" onClick={onClick} aria-label={label}>
      {children}
      {label}
    </button>
  );
}

function TrashSheet({
  trashedNotes,
  onClose,
  onRestore,
  onPurge,
}: {
  trashedNotes: BlocTrashedNote[];
  onClose: () => void;
  onRestore: (id: string) => void;
  onPurge: (id: string) => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Papelera" className="al-bloc-trash-modal fixed inset-0 z-[71] flex items-center justify-center p-4">
        <div className="al-bloc-trash-panel w-full max-w-md rounded-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4">
            <h3 className="text-base font-bold text-[#111111]">Papelera</h3>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="al-bloc-icon-btn-ghost flex h-8 w-8 items-center justify-center rounded-full">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[50vh] space-y-1.5 overflow-y-auto px-4 pb-4">
            {trashedNotes.length === 0 && <p className="px-1 py-6 text-center text-sm text-[#6b6f72]">La papelera está vacía.</p>}
            {trashedNotes.map((note) => (
              <div key={note.id} className="al-bloc-trash-row flex items-center justify-between gap-2 rounded-xl px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#111111]">{note.title || defaultTitle}</p>
                  <p className="text-xs text-[#9a958a]">Eliminada {formatBlocNoteCardDate(note.deleted_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" className="al-bloc-icon-btn-ghost flex h-8 w-8 items-center justify-center" onClick={() => onRestore(note.id)} aria-label="Restaurar" title="Restaurar">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" className="al-bloc-icon-btn-ghost al-bloc-icon-btn-danger flex h-8 w-8 items-center justify-center" onClick={() => onPurge(note.id)} aria-label="Eliminar definitivamente" title="Eliminar definitivamente">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="al-bloc-trash-footer px-5 py-3 text-center text-[11px]">Las notas eliminadas se quedan aquí hasta que las restaures o las borres para siempre.</p>
        </div>
      </div>
    </>
  );
}

function formatBlocNoteCardDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThatDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfThatDay.getTime()) / 86400000);
  if (diffDays === 0) return new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(date);
  if (diffDays === 1) return "Ayer";
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }).format(date);
}

function createBlocNote({ title, contentHtml = "", contentText = "" }: { title: string; contentHtml?: string; contentText?: string }): BlocNote {
  const now = nowIso();
  return {
    id: makeId(),
    title,
    contentHtml,
    contentText,
    favorite: false,
    created_at: now,
    updated_at: now,
  };
}

function normalizeBlocNotes(value: unknown): BlocNote[] {
  const rawNotes = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.notes)
      ? value.notes
      : [];

  return rawNotes
    .filter(isRecord)
    .map((item) => {
      const title = stringValue(item.title) || stringValue(item.label) || defaultTitle;
      const legacyText = stringValue(item.content);
      const contentHtml = stringValue(item.contentHtml) || (legacyText ? textToHtml(legacyText) : "");
      const contentText = stringValue(item.contentText) || (contentHtml ? htmlToText(contentHtml) : legacyText);
      const updated = stringValue(item.updated_at) || nowIso();
      return {
        id: stringValue(item.id) || makeId(),
        title,
        contentHtml,
        contentText,
        favorite: item.favorite === true,
        created_at: stringValue(item.created_at) || updated,
        updated_at: updated,
      };
    });
}

function normalizeBlocTrashed(value: unknown): BlocTrashedNote[] {
  const rawTrashed = isRecord(value) && Array.isArray(value.trashedNotes) ? value.trashedNotes : [];
  return rawTrashed
    .filter(isRecord)
    .map((item) => {
      const notes = normalizeBlocNotes([item]);
      const base = notes[0];
      if (!base) return null;
      return { ...base, deleted_at: stringValue(item.deleted_at) || base.updated_at };
    })
    .filter((note): note is BlocTrashedNote => note !== null);
}

function normalizeBlocSettings(value: unknown): BlocSettings {
  if (!isRecord(value)) return { fontSize: "base", defaultTitle };
  const fontSize = value.fontSize === "sm" || value.fontSize === "lg" ? value.fontSize : "base";
  const nextDefaultTitle = stringValue(value.defaultTitle) || stringValue(value.defaultLabel) || defaultTitle;
  return { fontSize, defaultTitle: nextDefaultTitle };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function textToHtml(text: string) {
  return escapeHtml(text).replace(/\r?\n/g, "<br>");
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function htmlToText(html: string) {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, " ");
  const element = document.createElement("div");
  element.innerHTML = sanitizeEditorHtml(html);
  return getEditorText(element);
}

function getEditorText(element: HTMLElement) {
  return (element.innerText || element.textContent || "").replace(/ /g, " ").replace(/\n+$/g, "");
}

function sanitizeEditorHtml(html: string) {
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

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatBlocEditedTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(date);
}

async function writeClipboardText(text: string) {
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

function downloadTextFile(filename: string, text: string) {
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

function downloadPdfFile(filename: string, title: string, text: string) {
  const pdf = buildSimplePdf(title, text);
  downloadBlob(filename, new Blob([pdf], { type: "application/pdf" }));
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

function buildSimplePdf(title: string, text: string) {
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 54;
  const maxChars = 88;
  const linesPerPage = 45;
  const lines = wrapPdfLines([title, "", ...text.split(/\r?\n/)], maxChars);
  const pages = chunkLines(lines.length ? lines : [title || defaultTitle], linesPerPage);
  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  const fontObjectId = 3 + pages.length * 2;

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = "";

  pages.forEach((pageLines, index) => {
    const pageObjectId = 3 + index * 2;
    const contentObjectId = pageObjectId + 1;
    pageObjectIds.push(pageObjectId);
    const content = buildPdfContent(pageLines, margin, pageHeight - margin);

    objects[pageObjectId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectId - 1] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });

  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[fontObjectId - 1] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return body;
}

function wrapPdfLines(values: string[], maxChars: number) {
  return values.flatMap((value) => {
    const source = value || "";
    if (!source) return [""];
    const words = source.split(/\s+/);
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
      if (!line) {
        line = word;
      } else if (`${line} ${word}`.length <= maxChars) {
        line = `${line} ${word}`;
      } else {
        lines.push(line);
        line = word;
      }
    }

    if (line) lines.push(line);
    return lines.length ? lines : [""];
  });
}

function chunkLines(lines: string[], size: number) {
  const chunks: string[][] = [];
  for (let index = 0; index < lines.length; index += size) {
    chunks.push(lines.slice(index, index + size));
  }
  return chunks.length ? chunks : [[]];
}

function buildPdfContent(lines: string[], x: number, y: number) {
  const escapedLines = lines.map((line) => `<${toUtf16Hex(line)}>`).join(" Tj T* ");
  return `BT\n/F1 11 Tf\n14 TL\n1 0 0 1 ${x} ${y} Tm\n${escapedLines} Tj\nET`;
}

function toUtf16Hex(value: string) {
  let hex = "FEFF";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 32;
    if (code > 0xffff) {
      const high = Math.floor((code - 0x10000) / 0x400) + 0xd800;
      const low = ((code - 0x10000) % 0x400) + 0xdc00;
      hex += high.toString(16).padStart(4, "0") + low.toString(16).padStart(4, "0");
    } else {
      hex += code.toString(16).padStart(4, "0");
    }
  }
  return hex.toUpperCase();
}

function sanitizeFilename(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").slice(0, 80) || "nota";
}

function safeJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function makeId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function nowIso() {
  return new Date().toISOString();
}

const blocBrandCss = `
  .al-bloc-editor-shell { background: white; border: 1px solid #ece7dc; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.05); display: flex; flex-direction: column; }
  .al-bloc-title-row { border-bottom: 1px solid #f0ece2; }
  .al-bloc-title-input { color: #111111; }
  .al-bloc-title-input::placeholder { color: #9a958a; }
  .al-bloc-toolbar { border-bottom: 1px solid #f0ece2; background: #faf8f4; }
  .al-bloc-toolbar-more { border-top: 1px solid #f0ece2; }
  .al-bloc-toolbar-divider { width: 1px; height: 20px; background: #ece7dc; margin: 0 2px; flex-shrink: 0; }
  .al-bloc-tool-btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 32px; min-width: 32px; padding: 0 7px; border-radius: 8px; border: none; background: transparent; color: #6b6f72; cursor: pointer; }
  .al-bloc-tool-btn:hover { background: white; color: #c94f21; }
  .al-bloc-size-group { display: inline-flex; align-items: center; gap: 1px; }
  .al-bloc-toolbar-select { border: 1px solid #ece7dc; border-radius: 8px; background: white; color: #333029; }
  .al-bloc-content-wrap { position: relative; background: white; }
  .al-bloc-content-watermark { position: absolute; z-index: 0; right: 24px; bottom: 12px; width: 220px; height: auto; opacity: 0.55; pointer-events: none; user-select: none; }
  .al-bloc-content { position: relative; z-index: 1; color: #333029; }
  .al-bloc-content a { color: #c94f21; text-decoration: underline; }
  .al-bloc-content blockquote { border-left: 3px solid #ece7dc; padding-left: 14px; color: #6b6f72; }
  .al-bloc-content h1 { font-size: 1.7em; font-weight: 700; color: #111111; }
  .al-bloc-content h2 { font-size: 1.4em; font-weight: 700; color: #111111; }
  .al-bloc-content h3 { font-size: 1.15em; font-weight: 700; color: #111111; }
  .al-bloc-content ol { list-style: decimal; padding-left: 24px; }
  .al-bloc-content ul { list-style: disc; padding-left: 24px; }
  .al-bloc-content img { max-width: 100%; border-radius: 8px; margin: 6px 0; }
  .al-bloc-footer { border-top: 1px solid #f0ece2; background: #faf8f4; color: #6b6f72; }
  .al-bloc-save-dot { background: #4C9A6E; }
  .al-bloc-export-select { border: 1px solid #ece7dc; border-radius: 8px; background: white; color: #333029; }
  .al-bloc-icon-btn { display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid #ece7dc; background: white; color: #6b6f72; cursor: pointer; }
  .al-bloc-icon-btn:hover { border-color: rgba(225, 93, 45, 0.35); color: #c94f21; }
  .al-bloc-icon-btn-active { background: #fbe7dd; border-color: rgba(225, 93, 45, 0.3); color: #c94f21; }
  .al-bloc-icon-btn-ghost { border-radius: 9px; border: none; background: transparent; color: #6b6f72; cursor: pointer; }
  .al-bloc-icon-btn-ghost:hover { background: #f3ece1; color: #111111; }
  .al-bloc-icon-btn-danger:hover { background: #fbe2df; color: #c23a2e; }
  .al-bloc-star-active { color: #E15D2D; }
  .al-bloc-primary-btn { height: 40px; border-radius: 12px; border: none; background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); color: white; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 10px 22px rgba(225, 93, 45, 0.25); }
  .al-bloc-primary-btn-compact { height: 34px; border-radius: 10px; font-size: 12px; box-shadow: 0 6px 14px rgba(225, 93, 45, 0.22); }
  .al-bloc-list-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 8px; text-align: center; border-radius: 12px; border: 1px dashed #ece7dc; }
  .al-bloc-list-empty-img { width: 96px; height: auto; opacity: 0.85; }
  .al-bloc-list-empty p { font-size: 12px; color: #6b6f72; margin: 0; }
  .al-bloc-search input { border: 1px solid #ece7dc; border-radius: 10px; background: white; }
  .al-bloc-sidebar { background: white; border: 1px solid #ece7dc; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.05); padding: 14px; }
  .al-bloc-tabs { display: flex; align-items: center; gap: 2px; border-radius: 11px; border: 1px solid #ece7dc; background: #faf8f4; padding: 3px; }
  .al-bloc-tab { flex: 1; height: 28px; border-radius: 8px; font-size: 11px; font-weight: 600; color: #6b6f72; background: transparent; border: none; cursor: pointer; }
  .al-bloc-tab-active { background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); color: white; box-shadow: 0 4px 10px rgba(225, 93, 45, 0.25); }
  .al-bloc-settings-panel { border: 1px solid #ece7dc; border-radius: 12px; background: #faf8f4; padding: 10px; }
  .al-bloc-size-btn { border: 1px solid #ece7dc; border-radius: 7px; background: white; color: #333029; font-weight: 600; cursor: pointer; }
  .al-bloc-size-btn-active { border-color: transparent; background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); color: white; }
  .al-bloc-note-row { display: flex; align-items: stretch; gap: 2px; }
  .al-bloc-note-card { min-width: 0; flex: 1; border-radius: 10px; padding: 8px 10px; text-align: left; background: transparent; border: none; cursor: pointer; color: #333029; }
  .al-bloc-note-card:hover { background: #faf8f4; }
  .al-bloc-note-card-active { background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); color: white; }
  .al-bloc-note-card-meta { color: #9a958a; }
  .al-bloc-note-card-active .al-bloc-note-card-meta { color: rgba(255,255,255,0.75); }
  .al-bloc-note-card-star { color: #ffe3ba; }
  .al-bloc-note-card:not(.al-bloc-note-card-active) .al-bloc-note-card-star { color: #E15D2D; }
  .al-bloc-note-row-delete { display: flex; align-items: center; justify-content: center; width: 30px; border-radius: 9px; border: none; background: transparent; color: #9a958a; cursor: pointer; opacity: 0; }
  .group:hover .al-bloc-note-row-delete { opacity: 1; }
  .al-bloc-note-row-delete:hover { background: #fbe2df; color: #c23a2e; }
  .al-bloc-trash-link { border-top: 1px solid #f0ece2; color: #6b6f72; background: none; border-left: none; border-right: none; border-bottom: none; cursor: pointer; }
  .al-bloc-trash-link:hover { color: #c94f21; }
  .al-bloc-trash-count { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: #fbe7dd; color: #c94f21; font-size: 10.5px; font-weight: 700; }
  .al-bloc-trash-modal { background: rgba(17,17,17,0.35); }
  .al-bloc-trash-panel { background: white; box-shadow: 0 24px 60px rgba(17,17,17,0.18); }
  .al-bloc-trash-row { background: #faf8f4; border: 1px solid #f0ece2; }
  .al-bloc-trash-footer { border-top: 1px solid #f0ece2; color: #9a958a; }
  .al-bloc-save-dot { background: #4C9A6E; }
  .al-bloc-mobile-toolbar { border-top: 1px solid #f0ece2; }
  .al-bloc-mobile-toolbar-btn { color: #6b6f72; background: none; border: none; }
  .al-bloc-mobile-toolbar-btn:hover { background: #faf8f4; color: #c94f21; }
  .al-bloc-mobile-toolbar-more { border-left: 1px solid #f0ece2; color: #6b6f72; background: none; border-top: none; border-right: none; border-bottom: none; }
  .al-bloc-mobile-card { border: 2px solid #ece7dc; background: white; color: #333029; }
  .al-bloc-mobile-card-active { border-color: transparent; background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); color: white; box-shadow: 0 10px 22px rgba(225,93,45,0.25); }
  .al-bloc-mobile-card-meta { color: #9a958a; }
  .al-bloc-mobile-card-active .al-bloc-mobile-card-meta { color: rgba(255,255,255,0.75); }
  .al-bloc-mobile-card-menu { color: inherit; opacity: 0.75; background: none; border: none; }
  .al-bloc-sheet { background: white; border-top: 1px solid #ece7dc; box-shadow: 0 -12px 32px rgba(17,17,17,0.12); }
  .al-bloc-sheet-handle { background: #ece7dc; }
  .al-bloc-sheet-row { color: #333029; background: none; border: none; }
  .al-bloc-sheet-row:hover { background: #faf8f4; }
  .al-bloc-sheet-row-danger { color: #c23a2e; }
  .al-bloc-sheet-row-danger:hover { background: #fbe2df; }
  .al-bloc-sheet-tile { border: 1px solid #ece7dc; color: #6b6f72; background: white; }
  .al-bloc-sheet-tile:hover { background: #faf8f4; color: #111111; }
`;
