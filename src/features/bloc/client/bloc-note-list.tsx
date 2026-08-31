"use client";

import React from "react";
import { FileText, RotateCcw, Star, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { defaultTitle, type BlocNote, type BlocTrashedNote, type ListTab } from "./bloc-types";

export function MobileNoteCard({
  note,
  active,
  onSelect,
  onDelete,
}: {
  note: BlocNote;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={cn("al-bloc-mobile-card relative flex w-48 shrink-0 snap-start items-center gap-2 rounded-xl px-2.5 py-2", active && "al-bloc-mobile-card-active")}>
      <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={onSelect}>
        <FileText className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1">
            <span className="block truncate text-xs font-semibold">{note.title || defaultTitle}</span>
            {note.favorite && <Star className="h-3 w-3 shrink-0" fill="currentColor" />}
          </span>
          <span className="al-bloc-mobile-card-meta block truncate text-[10px]">
            {countWords(note.contentText)} palabras · {formatBlocNoteCardDate(note.updated_at)}
          </span>
        </span>
      </button>
      <button
        type="button"
        className="al-bloc-mobile-card-delete flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        onClick={(event) => { event.stopPropagation(); onDelete(); }}
        aria-label={`Eliminar ${note.title || defaultTitle}`}
        title="Mover a la papelera"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function MobileSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={title} className="al-bloc-sheet fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-[71] max-h-[calc(100dvh-env(safe-area-inset-bottom)-1.5rem)] overflow-y-auto rounded-2xl pb-safe sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100vw-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[calc(100dvh-2rem)]">
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

export function MobileSheetRow({
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

export function TrashSheet({
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

export function emptyListMessage(listTab: ListTab, searchTerm: string): string {
  if (searchTerm.trim()) return "No hay notas con esa búsqueda.";
  if (listTab === "favoritas") return "Aún no tienes notas favoritas.";
  return "Aún no tienes notas. Empieza a escribir a la izquierda.";
}

export function formatBlocNoteCardDate(value: string) {
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

export function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function formatBlocEditedTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(date);
}
