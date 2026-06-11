"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Clock,
  Copy,
  Download,
  FilePlus2,
  FileText,
  Files,
  Highlighter,
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
  Search,
  SlidersHorizontal,
  Trash2,
  Type,
  Underline,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type BlocNote = {
  id: string;
  title: string;
  contentHtml: string;
  contentText: string;
  created_at: string;
  updated_at: string;
};

type BlocSettings = {
  fontSize: "sm" | "base" | "lg";
  defaultTitle: string;
};

const blocKey = "d1os:notepad:v1";
const legacyBlocKey = "techlife.bloc.D1OS.v1";
const blocSettingsKey = "d1os:notepad:settings:v1";
const legacyBlocSettingsKey = "techlife.bloc.settings.D1OS.v1";
const defaultTitle = "Documento sin titulo";

type MobileSheetId = "format" | "insert" | "export" | "more" | "settings" | null;

export function BlocNotepad() {
  const [notes, setNotes] = useState<BlocNote[]>([]);
  const [activeId, setActiveId] = useState("");
  const [settings, setSettings] = useState<BlocSettings>({ fontSize: "base", defaultTitle });
  const [searchTerm, setSearchTerm] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [notice, setNotice] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<MobileSheetId>(null);
  const [menuNoteId, setMenuNoteId] = useState<string | null>(null);
  const [titleEditing, setTitleEditing] = useState(false);
  const notesRef = useRef<BlocNote[]>([]);
  const activeIdRef = useRef("");
  const editorRef = useRef<HTMLDivElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

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
    const savedNotes = normalizeBlocNotes(raw ? safeJson(raw) : null);
    const initialNotes = savedNotes.length ? savedNotes : [createBlocNote({ title: defaultTitle })];

    setSettings(normalizeBlocSettings(rawSettings ? safeJson(rawSettings) : null));
    setNotes(initialNotes);
    setActiveId(initialNotes[0].id);
    setLoaded(true);
  }, []);

  useEffect(() => {
    return () => {
      if (notesRef.current.length) {
        localStorage.setItem(blocKey, JSON.stringify({ version: 1, notes: notesRef.current }));
      }
    };
  }, []);

  useEffect(() => {
    if (!loaded || notes.length === 0) return;
    setSaveState("saving");
    const timeoutId = window.setTimeout(() => {
      localStorage.setItem(blocKey, JSON.stringify({ version: 1, notes }));
      setSaveState("saved");
    }, 450);
    return () => window.clearTimeout(timeoutId);
  }, [loaded, notes]);

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
  const filteredNotes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return notes;
    return notes.filter((note) => `${note.title} ${note.contentText}`.toLowerCase().includes(query));
  }, [notes, searchTerm]);

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
    setNotice("Nota creada");
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
  }

  function deleteNote(id: string) {
    const target = notes.find((note) => note.id === id);
    if (!target) return;
    if (!window.confirm(`Eliminar "${target.title || defaultTitle}"?`)) return;

    const next = notes.filter((note) => note.id !== id);
    if (next.length === 0) {
      const fresh = createBlocNote({ title: defaultTitle });
      setNotes([fresh]);
      setActiveId(fresh.id);
    } else {
      setNotes(next);
      if (activeId === id) setActiveId(next[0].id);
    }
    setNotice("Nota eliminada");
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
    };
    reader.readAsText(file);
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
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar notas..."
              className="h-11 rounded-xl pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl"
            onClick={() => setMobileSheet("settings")}
            aria-label="Ajustes del bloc"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl"
            onClick={createNote}
            aria-label="Nueva nota"
          >
            <Plus className="h-5 w-5" />
          </Button>
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
            <div className="w-full rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
              No hay notas con esa búsqueda.
            </div>
          )}
        </div>

        <section className="mt-3 overflow-hidden rounded-2xl border-2 border-primary/25 bg-card shadow-sm">
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
                <h2 className="truncate text-2xl font-bold leading-tight">{activeNote?.title || defaultTitle}</h2>
                <button
                  type="button"
                  className="flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setTitleEditing(true)}
                  aria-label="Editar título"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
            <span className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
              {saveState === "saving" ? "Guardando..." : (
                <>
                  Guardado automáticamente
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </>
              )}
            </span>
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
              "empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
              "min-h-[45dvh] max-h-[58dvh] overflow-y-auto px-4 py-4 leading-7 outline-none",
              "[&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
              "[&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold",
              "[&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6",
              fontClass,
            )}
          />

          <div className="flex items-stretch border-t">
            <MobileToolbarButton label="Formato" onClick={() => setMobileSheet("format")}>
              <Type className="h-4 w-4" />
            </MobileToolbarButton>
            <MobileToolbarButton label="Insertar" onClick={() => setMobileSheet("insert")}>
              <Plus className="h-4 w-4" />
            </MobileToolbarButton>
            <MobileToolbarButton label="Exportar" onClick={() => setMobileSheet("export")}>
              <Download className="h-4 w-4" />
            </MobileToolbarButton>
            <button
              type="button"
              className="flex w-14 items-center justify-center border-l text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setMobileSheet("more")}
              aria-label="Más opciones"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </section>

        <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 text-center text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          <span>{saveState === "saving" ? "Guardando..." : "Guardado automáticamente"}</span>
          <span>· Última edición: {activeNote ? formatBlocEditedTime(activeNote.updated_at) : "--:--"}</span>
          <span>· {wordCount} palabras</span>
          {notice && <span className="text-primary">· {notice}</span>}
        </p>

        <input ref={uploadInputRef} type="file" accept=".txt,.md,text/plain,text/markdown" className="hidden" onChange={handleUpload} />

        {mobileSheet === "format" && (
          <MobileSheet title="Formato" onClose={() => setMobileSheet(null)}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Estilo de texto</p>
            <div className="grid grid-cols-3 gap-2">
              <MobileSheetTile label="Negrita" onClick={() => runEditorCommand("bold")}><Bold className="h-4 w-4" /></MobileSheetTile>
              <MobileSheetTile label="Cursiva" onClick={() => runEditorCommand("italic")}><Italic className="h-4 w-4" /></MobileSheetTile>
              <MobileSheetTile label="Subrayado" onClick={() => runEditorCommand("underline")}><Underline className="h-4 w-4" /></MobileSheetTile>
              <MobileSheetTile label="Lista" onClick={() => runEditorCommand("insertUnorderedList")}><List className="h-4 w-4" /></MobileSheetTile>
              <MobileSheetTile label="Numerada" onClick={() => runEditorCommand("insertOrderedList")}><ListOrdered className="h-4 w-4" /></MobileSheetTile>
              <MobileSheetTile label="Enlace" onClick={createLink}><Link2 className="h-4 w-4" /></MobileSheetTile>
            </div>
            <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Estilo de párrafo</p>
            <div className="grid grid-cols-3 gap-2">
              <MobileSheetTile label="Normal" onClick={() => setParagraphBlock("P")}><span className="text-sm font-semibold">P</span></MobileSheetTile>
              <MobileSheetTile label="Título 1" onClick={() => setParagraphBlock("H1")}><span className="text-sm font-semibold">H1</span></MobileSheetTile>
              <MobileSheetTile label="Título 2" onClick={() => setParagraphBlock("H2")}><span className="text-sm font-semibold">H2</span></MobileSheetTile>
              <MobileSheetTile label="Título 3" onClick={() => setParagraphBlock("H3")}><span className="text-sm font-semibold">H3</span></MobileSheetTile>
              <MobileSheetTile label="Cita" onClick={() => setParagraphBlock("BLOCKQUOTE")}><span className="text-sm font-semibold">&ldquo;&rdquo;</span></MobileSheetTile>
            </div>
            <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Alineación</p>
            <div className="grid grid-cols-4 gap-2">
              <MobileSheetTile label="Izquierda" onClick={() => runEditorCommand("justifyLeft")}><AlignLeft className="h-4 w-4" /></MobileSheetTile>
              <MobileSheetTile label="Centro" onClick={() => runEditorCommand("justifyCenter")}><AlignCenter className="h-4 w-4" /></MobileSheetTile>
              <MobileSheetTile label="Derecha" onClick={() => runEditorCommand("justifyRight")}><AlignRight className="h-4 w-4" /></MobileSheetTile>
              <MobileSheetTile label="Justificar" onClick={() => runEditorCommand("justifyFull")}><AlignJustify className="h-4 w-4" /></MobileSheetTile>
            </div>
            <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tamaño del editor</p>
            <div className="grid grid-cols-3 gap-2">
              {(["sm", "base", "lg"] as const).map((fontSize) => (
                <Button
                  key={fontSize}
                  type="button"
                  variant={settings.fontSize === fontSize ? "default" : "outline"}
                  className="h-11 rounded-xl"
                  onClick={() => persistSettings({ ...settings, fontSize })}
                >
                  {fontSize === "sm" ? "S" : fontSize === "base" ? "M" : "L"}
                </Button>
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
              <MobileSheetRow label="Ajustes" onClick={() => setMobileSheet("settings")}><SlidersHorizontal className="h-4 w-4" /></MobileSheetRow>
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
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tamaño del editor</p>
            <div className="grid grid-cols-3 gap-2">
              {(["sm", "base", "lg"] as const).map((fontSize) => (
                <Button
                  key={fontSize}
                  type="button"
                  variant={settings.fontSize === fontSize ? "default" : "outline"}
                  className="h-11 rounded-xl"
                  onClick={() => persistSettings({ ...settings, fontSize })}
                >
                  {fontSize === "sm" ? "S" : fontSize === "base" ? "M" : "L"}
                </Button>
              ))}
            </div>
            <p className="mb-1.5 mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Título por defecto</p>
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
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="grid gap-4 xl:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="flex min-h-[520px] flex-col rounded-lg border bg-card p-3">
          <Button type="button" className="w-full justify-start" onClick={createNote}>
            <FilePlus2 className="h-4 w-4" />
            Nueva Nota
          </Button>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar notas..."
              className="h-9 pl-9"
            />
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>Notas</span>
            <span>{notes.length}</span>
          </div>

          <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            {filteredNotes.map((note) => (
              <div key={note.id} className="group flex items-start gap-1">
                <button
                  type="button"
                  className={cn(
                    "min-w-0 flex-1 rounded-md px-3 py-2 text-left transition-colors",
                    note.id === activeId ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                  onClick={() => setActiveId(note.id)}
                >
                  <span className="block truncate text-sm font-medium">{note.title || defaultTitle}</span>
                  <span className={cn("mt-1 block truncate text-xs", note.id === activeId ? "text-primary-foreground/75" : "text-muted-foreground")}>
                    {formatBlocNoteMeta(note)}
                  </span>
                </button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-muted-foreground opacity-100 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={() => deleteNote(note.id)}
                  aria-label="Eliminar nota"
                  title="Eliminar nota"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {filteredNotes.length === 0 && (
              <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                No hay notas con esa busqueda.
              </div>
            )}
          </div>

          <div className="mt-3 border-t pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs text-muted-foreground"
              onClick={() => setShowSettings((value) => !value)}
            >
              {showSettings ? "Cerrar ajustes" : "Ajustes"}
            </Button>
            {showSettings && (
              <div className="mt-3 space-y-4">
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Tamano del editor</p>
                  <div className="grid grid-cols-3 gap-1">
                    {(["sm", "base", "lg"] as const).map((fontSize) => (
                      <Button
                        key={fontSize}
                        type="button"
                        size="sm"
                        variant={settings.fontSize === fontSize ? "default" : "outline"}
                        onClick={() => persistSettings({ ...settings, fontSize })}
                      >
                        {fontSize === "sm" ? "S" : fontSize === "base" ? "M" : "L"}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs text-muted-foreground">Titulo por defecto</p>
                  <Input
                    value={settings.defaultTitle}
                    onChange={(event) => persistSettings({ ...settings, defaultTitle: event.target.value })}
                    placeholder={defaultTitle}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </aside>

        <div className="min-w-0 overflow-hidden rounded-lg border bg-card">
          <div className="border-b bg-background/70 p-3">
            <Input
              value={activeNote?.title ?? ""}
              onChange={(event) => renameActiveNote(event.target.value)}
              placeholder={defaultTitle}
              className="h-11 border-input bg-card text-base font-semibold sm:text-lg"
            />
          </div>

          <BlocEditorToolbar
            onCommand={runEditorCommand}
            onBlockChange={setParagraphBlock}
            onColor={(color) => runEditorCommand("foreColor", color)}
            onHighlight={(color) => runEditorCommand("backColor", color)}
            onInsert={insertItem}
            onLink={createLink}
            onUploadClick={() => uploadInputRef.current?.click()}
            onExportPdf={exportActivePdf}
            onExportWord={exportActiveWord}
          />

          <div className="bg-background">
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
                "empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
                "min-h-[430px] max-h-[62vh] overflow-y-auto px-5 py-4 leading-7 outline-none sm:min-h-[520px] sm:px-8 sm:py-6",
                "[&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
                "[&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold",
                "[&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6",
                fontClass,
              )}
            />
          </div>

          <div className="flex flex-col gap-3 border-t bg-background/70 px-4 py-3 text-xs text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <span>{saveState === "saving" ? "Guardando..." : "Guardado automaticamente"}</span>
              <span> · Ultima edicion: {activeNote ? formatBlocEditedTime(activeNote.updated_at) : "--:--"}</span>
              {notice && <span className="ml-2 text-primary">{notice}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <span>Palabras: {wordCount}</span>
              <span>Caracteres: {charCount}</span>
              <div className="ml-0 flex items-center gap-1 sm:ml-2">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateNote()} aria-label="Duplicar nota" title="Duplicar nota">
                  <Files className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={copyActiveNote} aria-label="Copiar texto" title="Copiar texto">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={downloadActiveNote} aria-label="Descargar TXT" title="Descargar TXT">
                  <Download className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={exportActivePdf} aria-label="Exportar PDF" title="Exportar PDF">
                  PDF
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={exportActiveWord} aria-label="Exportar Word" title="Exportar Word">
                  Word
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => activeNote && deleteNote(activeNote.id)} aria-label="Eliminar nota" title="Eliminar nota">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <input ref={uploadInputRef} type="file" accept=".txt,.md,text/plain,text/markdown" className="hidden" onChange={handleUpload} />
      <Button type="button" className="fixed bottom-24 right-5 z-30 h-14 w-14 rounded-full shadow-lg md:bottom-8" size="icon" onClick={createNote} aria-label="Nueva nota" title="Nueva nota">
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}

function BlocEditorToolbar({
  onCommand,
  onBlockChange,
  onColor,
  onHighlight,
  onInsert,
  onLink,
  onUploadClick,
  onExportPdf,
  onExportWord,
}: {
  onCommand: (command: string, value?: string) => void;
  onBlockChange: (value: string) => void;
  onColor: (value: string) => void;
  onHighlight: (value: string) => void;
  onInsert: (value: string) => void;
  onLink: () => void;
  onUploadClick: () => void;
  onExportPdf: () => void;
  onExportWord: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b bg-card px-2 py-2">
      <BlocToolbarGroup>
        <BlocToolButton label="Deshacer" onClick={() => onCommand("undo")}><Undo2 className="h-4 w-4" /></BlocToolButton>
        <BlocToolButton label="Rehacer" onClick={() => onCommand("redo")}><Redo2 className="h-4 w-4" /></BlocToolButton>
      </BlocToolbarGroup>
      <BlocToolbarGroup>
        <Select defaultValue="Arial" className="h-8 w-[104px] text-sm" onChange={(event) => onCommand("fontName", event.target.value)}>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times</option>
          <option value="Courier New">Mono</option>
        </Select>
        <Select defaultValue="P" className="h-8 w-[108px] text-sm" onChange={(event) => onBlockChange(event.target.value)}>
          <option value="P">Normal</option>
          <option value="H1">Titulo 1</option>
          <option value="H2">Titulo 2</option>
          <option value="H3">Titulo 3</option>
          <option value="BLOCKQUOTE">Cita</option>
        </Select>
      </BlocToolbarGroup>
      <BlocToolbarGroup>
        <BlocToolButton label="Reducir tamano" onClick={() => onCommand("fontSize", "2")}><Type className="h-3.5 w-3.5" /></BlocToolButton>
        <BlocToolButton label="Tamano normal" onClick={() => onCommand("fontSize", "3")}><span className="text-sm font-semibold">16</span></BlocToolButton>
        <BlocToolButton label="Aumentar tamano" onClick={() => onCommand("fontSize", "5")}><Type className="h-4 w-4" /></BlocToolButton>
      </BlocToolbarGroup>
      <BlocToolbarGroup>
        <BlocToolButton label="Negrita" onClick={() => onCommand("bold")}><Bold className="h-4 w-4" /></BlocToolButton>
        <BlocToolButton label="Cursiva" onClick={() => onCommand("italic")}><Italic className="h-4 w-4" /></BlocToolButton>
        <BlocToolButton label="Subrayado" onClick={() => onCommand("underline")}><Underline className="h-4 w-4" /></BlocToolButton>
        <BlocToolButton label="Lista" onClick={() => onCommand("insertUnorderedList")}><List className="h-4 w-4" /></BlocToolButton>
        <BlocToolButton label="Lista numerada" onClick={() => onCommand("insertOrderedList")}><ListOrdered className="h-4 w-4" /></BlocToolButton>
        <BlocToolButton label="Enlace" onClick={onLink}><Link2 className="h-4 w-4" /></BlocToolButton>
        <label className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="Color de texto" aria-label="Color de texto">
          <Palette className="h-4 w-4" />
          <input type="color" className="sr-only" onChange={(event) => onColor(event.target.value)} />
        </label>
        <label className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="Resaltar" aria-label="Resaltar">
          <Highlighter className="h-4 w-4" />
          <input type="color" className="sr-only" defaultValue="#fff3a3" onChange={(event) => onHighlight(event.target.value)} />
        </label>
      </BlocToolbarGroup>
      <BlocToolbarGroup>
        <Select defaultValue="" className="h-8 w-[108px] text-sm" onChange={(event) => { onInsert(event.target.value); event.currentTarget.value = ""; }}>
          <option value="">Insertar</option>
          <option value="date">Fecha</option>
          <option value="time">Hora</option>
          <option value="divider">Separador</option>
          <option value="check">Checklist</option>
        </Select>
        <BlocToolButton label="Alinear izquierda" onClick={() => onCommand("justifyLeft")}><AlignLeft className="h-4 w-4" /></BlocToolButton>
        <BlocToolButton label="Alinear centro" onClick={() => onCommand("justifyCenter")}><AlignCenter className="h-4 w-4" /></BlocToolButton>
        <BlocToolButton label="Alinear derecha" onClick={() => onCommand("justifyRight")}><AlignRight className="h-4 w-4" /></BlocToolButton>
        <BlocToolButton label="Justificar" onClick={() => onCommand("justifyFull")}><AlignJustify className="h-4 w-4" /></BlocToolButton>
      </BlocToolbarGroup>
      <BlocToolbarGroup>
        <BlocToolButton label="Subir Doc" onClick={onUploadClick}><Upload className="h-4 w-4" /></BlocToolButton>
        <BlocToolButton label="Exportar PDF" onClick={onExportPdf}><Download className="h-4 w-4" /><span className="text-[11px] font-semibold">PDF</span></BlocToolButton>
        <BlocToolButton label="Exportar Word" onClick={onExportWord}><FileText className="h-4 w-4" /><span className="text-[11px] font-semibold">Word</span></BlocToolButton>
      </BlocToolbarGroup>
    </div>
  );
}

function BlocToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" variant="ghost" size="sm" className="h-8 min-w-8 shrink-0 px-2 text-muted-foreground hover:text-foreground" onClick={onClick} aria-label={label} title={label}>
      {children}
    </Button>
  );
}

function BlocToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-1 rounded-md border bg-background/60 p-1">{children}</div>;
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
    <div
      className={cn(
        "relative w-36 shrink-0 snap-start rounded-2xl border p-3 transition-colors",
        active ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-border bg-card hover:bg-muted/50",
      )}
    >
      <button type="button" className="block w-full text-left" onClick={onSelect}>
        <FileText className={cn("h-5 w-5", active ? "text-primary-foreground" : "text-muted-foreground")} />
        <span className="mt-2 block truncate text-sm font-semibold">{note.title || defaultTitle}</span>
        <span className={cn("mt-0.5 block text-xs", active ? "text-primary-foreground/75" : "text-muted-foreground")}>
          {countWords(note.contentText)} palabras
        </span>
        <span className={cn("block text-xs", active ? "text-primary-foreground/75" : "text-muted-foreground")}>
          {formatBlocNoteCardDate(note.updated_at)}
        </span>
      </button>
      <button
        type="button"
        className={cn(
          "absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full transition-colors",
          active ? "text-primary-foreground/80 hover:bg-white/15" : "text-muted-foreground hover:bg-muted",
        )}
        onClick={(event) => { event.stopPropagation(); onMenu(); }}
        aria-label={`Opciones de ${note.title || defaultTitle}`}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
    </div>
  );
}

function MobileToolbarButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex h-12 flex-1 items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors first:border-l-0 hover:bg-muted hover:text-foreground [&+&]:border-l"
      onClick={onClick}
      aria-label={label}
    >
      {children}
      {label}
    </button>
  );
}

function MobileSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-x-0 bottom-0 z-[71] max-h-[80dvh] overflow-y-auto rounded-t-2xl border-t bg-background pb-safe shadow-2xl"
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted-foreground/20" />
        <div className="flex items-center justify-between px-5 py-3">
          <h3 className="truncate text-base font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
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
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors",
        destructive ? "text-destructive hover:bg-destructive/10" : "hover:bg-muted",
      )}
      onClick={onClick}
    >
      {children}
      {label}
    </button>
  );
}

function MobileSheetTile({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex h-14 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      onClick={onClick}
      aria-label={label}
    >
      {children}
      {label}
    </button>
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
        created_at: stringValue(item.created_at) || updated,
        updated_at: updated,
      };
    });
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
  return (element.innerText || element.textContent || "").replace(/\u00a0/g, " ").replace(/\n+$/g, "");
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

function formatBlocNoteMeta(note: BlocNote) {
  return `${countWords(note.contentText)} palabras · ${formatBlocEditedTime(note.updated_at)}`;
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
  const blob = new Blob(["\ufeff", documentHtml], { type: "application/msword;charset=utf-8" });
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
