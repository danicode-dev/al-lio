"use client";

import { useCallback, useEffect, useRef } from "react";
import { Copy, Download, FileText, Files, MoreVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function useDismissableMenu(open: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      onClose();
      triggerRef.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return { containerRef, triggerRef };
}

export function ExportMenu({
  mobileAction = false,
  open,
  onOpenChange,
  noteTitle,
  disabled,
  exporting,
  onExportPdf,
  onExportWord,
  onExportTxt,
}: {
  mobileAction?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteTitle: string;
  disabled: boolean;
  exporting: boolean;
  onExportPdf: () => void;
  onExportWord: () => void;
  onExportTxt: () => void;
}) {
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const { containerRef, triggerRef } = useDismissableMenu(open, close);

  function pick(action: () => void) {
    action();
    close();
  }

  return (
    <div ref={containerRef} className={cn("relative", mobileAction && "flex flex-1")}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={cn(mobileAction ? "al-bloc-mobile-action w-full" : "al-bloc-header-btn flex h-9 items-center gap-1.5 px-3")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={exporting ? "Exportando nota" : "Exportar nota"}
        title={exporting ? "Exportando nota" : "Exportar nota"}
        onClick={() => onOpenChange(!open)}
      >
        <Download className="h-4 w-4" />
        <span className={cn(!mobileAction && "hidden sm:inline")}>{exporting ? "Exportando…" : "Exportar"}</span>
      </button>
      {open && (
        <div role="menu" aria-label={`Exportar "${noteTitle}"`} className={cn("al-bloc-menu absolute right-0 z-40 w-48 rounded-xl p-1", mobileAction ? "bottom-full mb-2" : "top-full mt-2")}>
          <button role="menuitem" type="button" className="al-bloc-menu-item" aria-label={`Exportar "${noteTitle}" a PDF`} title="PDF" onClick={() => pick(onExportPdf)}>
            <FileText className="h-4 w-4" />PDF
          </button>
          <button role="menuitem" type="button" className="al-bloc-menu-item" aria-label={`Exportar "${noteTitle}" a Word`} title="Word" onClick={() => pick(onExportWord)}>
            <FileText className="h-4 w-4" />Word
          </button>
          <button role="menuitem" type="button" className="al-bloc-menu-item" aria-label={`Exportar "${noteTitle}" a TXT`} title="TXT" onClick={() => pick(onExportTxt)}>
            <FileText className="h-4 w-4" />TXT
          </button>
        </div>
      )}
    </div>
  );
}

export function NoteOverflowMenu({
  mobileAction = false,
  open,
  onOpenChange,
  disabled,
  onDuplicate,
  onCopyText,
  onDelete,
}: {
  mobileAction?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled: boolean;
  onDuplicate: () => void;
  onCopyText: () => void;
  onDelete: () => void;
}) {
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const { containerRef, triggerRef } = useDismissableMenu(open, close);

  function pick(action: () => void) {
    action();
    close();
  }

  return (
    <div ref={containerRef} className={cn("relative", mobileAction && "flex flex-1")}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={cn(mobileAction ? "al-bloc-mobile-action w-full" : "al-bloc-header-btn flex h-9 w-9 items-center justify-center")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Más opciones de la nota"
        onClick={() => onOpenChange(!open)}
      >
        <MoreVertical className="h-4 w-4" />
        {mobileAction ? <span>Más</span> : null}
      </button>
      {open && (
        <div role="menu" aria-label="Más opciones de la nota" className={cn("al-bloc-menu absolute right-0 z-40 w-52 rounded-xl p-1", mobileAction ? "bottom-full mb-2" : "top-full mt-2")}>
          <button role="menuitem" type="button" className="al-bloc-menu-item" onClick={() => pick(onDuplicate)}>
            <Files className="h-4 w-4" />Duplicar nota
          </button>
          <button role="menuitem" type="button" className="al-bloc-menu-item" onClick={() => pick(onCopyText)}>
            <Copy className="h-4 w-4" />Copiar texto
          </button>
          <div className="al-bloc-menu-divider" />
          <button role="menuitem" type="button" className="al-bloc-menu-item al-bloc-menu-item-danger" onClick={() => pick(onDelete)}>
            <Trash2 className="h-4 w-4" />Eliminar nota
          </button>
        </div>
      )}
    </div>
  );
}

export function SlidersIcon() {
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
