"use client";

import React, { useEffect, useState } from "react";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, ChevronDown, FileText, Highlighter, List, ListOrdered, Palette, Plus, Redo2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { clampEditorFontSize } from "./bloc-editor-helpers";
import { editorFonts, type EditorFormatState } from "./bloc-types";

export function BlocEditorToolbar({
  mobile = false,
  formatState,
  onCommand,
  onBlockChange,
  onFontFamily,
  onFontSize,
  onColor,
  onHighlight,
}: {
  mobile?: boolean;
  formatState: EditorFormatState;
  onCommand: (command: string, value?: string) => void;
  onBlockChange: (value: string) => void;
  onFontFamily: (value: string) => void;
  onFontSize: (value: number) => void;
  onColor: (value: string) => void;
  onHighlight: (value: string) => void;
}) {
  if (mobile) {
    return (
      <div className="al-bloc-toolbar al-bloc-toolbar-mobile" role="toolbar" aria-label="Formato esencial del documento">
        <div className="al-bloc-toolbar-row flex items-center">
          <BlocToolButton label="Deshacer" onClick={() => onCommand("undo")}><Undo2 className="h-4 w-4" /></BlocToolButton>
          <BlocToolButton label="Rehacer" onClick={() => onCommand("redo")}><Redo2 className="h-4 w-4" /></BlocToolButton>
          <span className="al-bloc-toolbar-divider" />
          <div className="al-bloc-tool-group">
            <BlocToolButton label="Negrita" active={formatState.bold} onClick={() => onCommand("bold")}><span className="text-sm font-black">B</span></BlocToolButton>
            <BlocToolButton label="Cursiva" active={formatState.italic} onClick={() => onCommand("italic")}><span className="text-sm font-serif font-bold italic">I</span></BlocToolButton>
            <BlocToolButton label="Subrayado" active={formatState.underline} onClick={() => onCommand("underline")}><span className="text-sm font-bold underline decoration-2 underline-offset-2">U</span></BlocToolButton>
          </div>
          <span className="al-bloc-toolbar-divider" />
          <MobileFontSizeSelect value={formatState.fontSize} onChange={onFontSize} />
          <MobileAlignmentSelect alignment={formatState.alignment} onCommand={onCommand} />
          <BlocListSelect compact list={formatState.list} onCommand={onCommand} />
        </div>
      </div>
    );
  }

  return (
    <div className="al-bloc-toolbar al-bloc-toolbar-desktop" role="toolbar" aria-label="Formato del documento">
      <div className="al-bloc-toolbar-row flex items-center gap-1 px-2 py-2">
        <BlocToolButton label="Deshacer" onClick={() => onCommand("undo")}><Undo2 className="h-4 w-4" /></BlocToolButton>
        <BlocToolButton label="Rehacer" onClick={() => onCommand("redo")}><Redo2 className="h-4 w-4" /></BlocToolButton>
        <span className="al-bloc-toolbar-divider" />

        <Select
          value={formatState.block}
          className="al-bloc-toolbar-select al-bloc-paragraph-select"
          onChange={(event) => onBlockChange(event.target.value)}
          aria-label="Estilo de párrafo o título"
          title="Estilo de párrafo o título"
        >
          <optgroup label="Párrafo">
            <option value="P">Texto normal</option>
            <option value="BLOCKQUOTE">Cita</option>
          </optgroup>
          <optgroup label="Títulos">
            <option value="H1">Título 1</option>
            <option value="H2">Título 2</option>
            <option value="H3">Título 3</option>
          </optgroup>
        </Select>

        <Select
          value={formatState.fontFamily}
          className="al-bloc-toolbar-select al-bloc-font-select"
          onChange={(event) => onFontFamily(event.target.value)}
          aria-label="Tipo de letra"
          title="Tipo de letra"
        >
          <optgroup label="Texto sans serif">
            {editorFonts.slice(0, 7).map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
          </optgroup>
          <optgroup label="Serif y monoespaciadas">
            {editorFonts.slice(7).map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
          </optgroup>
        </Select>

        <BlocFontSizeControl value={formatState.fontSize} onChange={onFontSize} />

        <span className="al-bloc-toolbar-divider" />
        <div className="al-bloc-tool-group">
          <BlocToolButton label="Negrita" active={formatState.bold} onClick={() => onCommand("bold")}><span className="text-sm font-black">B</span></BlocToolButton>
          <BlocToolButton label="Cursiva" active={formatState.italic} onClick={() => onCommand("italic")}><span className="text-sm font-serif font-bold italic">I</span></BlocToolButton>
          <BlocToolButton label="Subrayado" active={formatState.underline} onClick={() => onCommand("underline")}><span className="text-sm font-bold underline decoration-2 underline-offset-2">U</span></BlocToolButton>
        </div>

        <span className="al-bloc-toolbar-divider" />
        <div className="al-bloc-tool-group">
          <BlocToolButton label="Alinear a la izquierda" active={formatState.alignment === "left"} onClick={() => onCommand("justifyLeft")}><AlignLeft className="h-4 w-4" /></BlocToolButton>
          <BlocToolButton label="Centrar" active={formatState.alignment === "center"} onClick={() => onCommand("justifyCenter")}><AlignCenter className="h-4 w-4" /></BlocToolButton>
          <BlocToolButton label="Alinear a la derecha" active={formatState.alignment === "right"} onClick={() => onCommand("justifyRight")}><AlignRight className="h-4 w-4" /></BlocToolButton>
          <BlocToolButton label="Justificar" active={formatState.alignment === "justify"} onClick={() => onCommand("justifyFull")}><AlignJustify className="h-4 w-4" /></BlocToolButton>
        </div>

        <span className="al-bloc-toolbar-divider" />
        <BlocListSelect list={formatState.list} onCommand={onCommand} />

        <span className="al-bloc-toolbar-divider" />
        <label className="al-bloc-tool-btn al-bloc-color-tool cursor-pointer" title="Color de texto">
          <span className="sr-only">Color de texto</span>
          <span className="relative flex h-5 w-5 items-center justify-center">
            <Palette className="h-4 w-4" />
            <input type="color" className="al-bloc-color-input" defaultValue="#333029" onChange={(event) => onColor(event.target.value)} aria-label="Elegir color de texto" />
          </span>
        </label>
        <label className="al-bloc-tool-btn al-bloc-color-tool cursor-pointer" title="Color de resaltado">
          <span className="sr-only">Color de resaltado</span>
          <span className="relative flex h-5 w-5 items-center justify-center">
            <Highlighter className="h-4 w-4" />
            <input type="color" className="al-bloc-color-input" defaultValue="#fff3a3" onChange={(event) => onHighlight(event.target.value)} aria-label="Elegir color de resaltado" />
          </span>
        </label>
      </div>
    </div>
  );
}

export function BlocEditorEmptyState() {
  return (
    <div className="al-bloc-editor-empty" aria-hidden="true">
      <span className="al-bloc-editor-empty-icon"><FileText className="h-5 w-5" /></span>
      <p>Esta nota está vacía</p>
      <span>Empieza a escribir para guardar tus ideas.</span>
    </div>
  );
}

const mobileFontSizes = Array.from({ length: 41 }, (_, index) => index + 8).concat([54, 60, 72, 96]);

function MobileFontSizeSelect({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const options = mobileFontSizes.includes(value) ? mobileFontSizes : [...mobileFontSizes, value].sort((a, b) => a - b);
  return (
    <label className="al-bloc-mobile-size-select" title="Tamaño de letra en píxeles">
      <span className="sr-only">Tamaño de letra en píxeles</span>
      <select value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label="Tamaño de letra en píxeles">
        {options.map((size) => <option key={size} value={size}>{size} px</option>)}
      </select>
    </label>
  );
}

function MobileAlignmentSelect({ alignment, onCommand }: { alignment: EditorFormatState["alignment"]; onCommand: (command: string) => void }) {
  const AlignmentIcon = alignment === "center" ? AlignCenter : alignment === "right" ? AlignRight : alignment === "justify" ? AlignJustify : AlignLeft;
  const commandByAlignment: Record<EditorFormatState["alignment"], string> = {
    left: "justifyLeft",
    center: "justifyCenter",
    right: "justifyRight",
    justify: "justifyFull",
  };
  return (
    <label className={cn("al-bloc-mobile-icon-select", alignment !== "left" && "al-bloc-toolbar-select-active")} title="Alineación del texto">
      <span className="sr-only">Alineación del texto</span>
      <AlignmentIcon className="h-4 w-4" />
      <ChevronDown className="al-bloc-mobile-select-chevron" aria-hidden="true" />
      <select value={alignment} onChange={(event) => onCommand(commandByAlignment[event.target.value as EditorFormatState["alignment"]])} aria-label="Alineación del texto">
        <option value="left">Izquierda</option>
        <option value="center">Centrado</option>
        <option value="right">Derecha</option>
        <option value="justify">Justificado</option>
      </select>
    </label>
  );
}

function BlocFontSizeControl({ value, onChange, panel = false }: { value: number; onChange: (value: number) => void; panel?: boolean }) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commit(nextValue: string) {
    const parsed = Number.parseInt(nextValue, 10);
    const next = clampEditorFontSize(Number.isFinite(parsed) ? parsed : value);
    setDraft(String(next));
    onChange(next);
  }

  function nudge(delta: number) {
    const parsed = Number.parseInt(draft, 10);
    const base = Number.isFinite(parsed) ? parsed : value;
    commit(String(base + delta));
  }

  return (
    <div className={cn("al-bloc-size-group", panel && "al-bloc-size-group-panel")} aria-label="Tamaño de letra en píxeles">
      <BlocToolButton label="Reducir 1 px" onClick={() => nudge(-1)}><span className="text-base leading-none">−</span></BlocToolButton>
      <div className="al-bloc-font-size-field">
        <input
          type="number"
          min="8"
          max="96"
          step="1"
          inputMode="numeric"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") setDraft(String(value));
          }}
          aria-label="Tamaño de letra en píxeles"
          title="Tamaño de letra en píxeles"
        />
        <span aria-hidden="true">px</span>
      </div>
      <BlocToolButton label="Aumentar 1 px" onClick={() => nudge(1)}><Plus className="h-3.5 w-3.5" /></BlocToolButton>
    </div>
  );
}

export function MobileEditorFormatPanel({
  formatState,
  onCommand,
  onBlockChange,
  onFontFamily,
  onFontSize,
  onColor,
  onHighlight,
}: {
  formatState: EditorFormatState;
  onCommand: (command: string, value?: string) => void;
  onBlockChange: (value: string) => void;
  onFontFamily: (value: string) => void;
  onFontSize: (value: number) => void;
  onColor: (value: string) => void;
  onHighlight: (value: string) => void;
}) {
  return (
    <div className="al-bloc-mobile-format-panel space-y-4">
      <label className="block">
        <span className="al-bloc-panel-label">Párrafo o título</span>
        <Select value={formatState.block} className="al-bloc-toolbar-select al-bloc-panel-select" onChange={(event) => onBlockChange(event.target.value)}>
          <optgroup label="Párrafo">
            <option value="P">Texto normal</option>
            <option value="BLOCKQUOTE">Cita</option>
          </optgroup>
          <optgroup label="Títulos">
            <option value="H1">Título 1</option>
            <option value="H2">Título 2</option>
            <option value="H3">Título 3</option>
          </optgroup>
        </Select>
      </label>

      <label className="block">
        <span className="al-bloc-panel-label">Tipo de letra</span>
        <Select value={formatState.fontFamily} className="al-bloc-toolbar-select al-bloc-panel-select" onChange={(event) => onFontFamily(event.target.value)}>
          <optgroup label="Texto sans serif">
            {editorFonts.slice(0, 7).map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
          </optgroup>
          <optgroup label="Serif y monoespaciadas">
            {editorFonts.slice(7).map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
          </optgroup>
        </Select>
      </label>

      <div>
        <span className="al-bloc-panel-label">Tamaño de letra</span>
        <BlocFontSizeControl panel value={formatState.fontSize} onChange={onFontSize} />
      </div>

      <div>
        <span className="al-bloc-panel-label">Alineación</span>
        <div className="al-bloc-panel-alignment grid grid-cols-4 gap-2">
          <BlocToolButton label="Alinear a la izquierda" active={formatState.alignment === "left"} onClick={() => onCommand("justifyLeft")}><AlignLeft className="h-4 w-4" /></BlocToolButton>
          <BlocToolButton label="Centrar" active={formatState.alignment === "center"} onClick={() => onCommand("justifyCenter")}><AlignCenter className="h-4 w-4" /></BlocToolButton>
          <BlocToolButton label="Alinear a la derecha" active={formatState.alignment === "right"} onClick={() => onCommand("justifyRight")}><AlignRight className="h-4 w-4" /></BlocToolButton>
          <BlocToolButton label="Justificar" active={formatState.alignment === "justify"} onClick={() => onCommand("justifyFull")}><AlignJustify className="h-4 w-4" /></BlocToolButton>
        </div>
      </div>

      <label className="block">
        <span className="al-bloc-panel-label">Listas</span>
        <BlocListSelect panel list={formatState.list} onCommand={onCommand} />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="al-bloc-panel-color">
          <span><Palette className="h-4 w-4" />Color de texto</span>
          <input type="color" defaultValue="#333029" onChange={(event) => onColor(event.target.value)} aria-label="Elegir color de texto" />
        </label>
        <label className="al-bloc-panel-color">
          <span><Highlighter className="h-4 w-4" />Resaltado</span>
          <input type="color" defaultValue="#fff3a3" onChange={(event) => onHighlight(event.target.value)} aria-label="Elegir color de resaltado" />
        </label>
      </div>
    </div>
  );
}

function BlocListSelect({ compact = false, panel = false, list, onCommand }: { compact?: boolean; panel?: boolean; list: EditorFormatState["list"]; onCommand: (command: string) => void }) {
  function selectList(value: string) {
    if (value === "unordered") onCommand("insertUnorderedList");
    else if (value === "ordered") onCommand("insertOrderedList");
    else if (list === "unordered") onCommand("insertUnorderedList");
    else if (list === "ordered") onCommand("insertOrderedList");
  }

  if (compact) {
    const ListIcon = list === "ordered" ? ListOrdered : List;
    return (
      <label className={cn("al-bloc-mobile-icon-select", list && "al-bloc-toolbar-select-active")} title="Viñetas o numeración">
        <span className="sr-only">Elegir entre viñetas o numeración</span>
        <ListIcon className="h-4 w-4" />
        <ChevronDown className="al-bloc-mobile-select-chevron" aria-hidden="true" />
        <select value={list ?? ""} onChange={(event) => selectList(event.target.value)} aria-label="Elegir entre viñetas o numeración">
          <option value="">Sin lista</option>
          <option value="unordered">Viñetas</option>
          <option value="ordered">Numeración</option>
        </select>
      </label>
    );
  }

  return (
    <Select
      value={list ?? ""}
      className={cn("al-bloc-toolbar-select al-bloc-list-select", panel && "al-bloc-panel-select", list && "al-bloc-toolbar-select-active")}
      onChange={(event) => selectList(event.target.value)}
      aria-label="Elegir entre viñetas o numeración"
      title="Elegir entre viñetas o numeración"
    >
      <option value="">Listas</option>
      <option value="unordered">• Viñetas</option>
      <option value="ordered">1. Numeración</option>
    </Select>
  );
}

function BlocToolButton({ label, active = false, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={cn("al-bloc-tool-btn", active && "al-bloc-tool-btn-active")}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
    >
      {children}
    </button>
  );
}
