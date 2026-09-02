"use client";

import { memo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { JobApplication, ApplicationStatus } from "@/lib/job-radar/types";
import { APPLICATION_STATUSES, STATUS_LABELS, STATUS_COLORS } from "@/lib/job-radar/types";

export const CandidaturaCard = memo(function CandidaturaCard({
  app,
  noteValue,
  onNoteChange,
  onNoteSubmit,
  onStatusChange,
  onDelete,
}: {
  app: JobApplication;
  noteValue: string;
  onNoteChange: (v: string) => void;
  onNoteSubmit: () => void;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [showNotes, setShowNotes] = useState(false);
  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-2", app.is_new && "border-blue-400/50")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{app.company_name}</p>
          <p className="truncate text-xs text-muted-foreground">{app.job_title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {app.is_new && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[app.status])}>
            {STATUS_LABELS[app.status]}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs text-muted-foreground">
          {new Date(app.detected_at).toLocaleDateString("es-ES")}
          {app.source === "manual" && " · Manual"}
        </span>
        {app.job_url && (
          <a
            href={app.job_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Ver oferta
          </a>
        )}
        <a
          href={app.company_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          Pagina empleo
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <Select
          value={app.status}
          onChange={(e) => onStatusChange(app.id, e.target.value as ApplicationStatus)}
          className="h-7 text-xs"
        >
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </Select>
        <button
          type="button"
          onClick={() => setShowNotes((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {app.notes?.length ? `${app.notes.length} nota${app.notes.length !== 1 ? "s" : ""}` : "Añadir nota"}
        </button>
        <button
          type="button"
          onClick={() => onDelete(app.id)}
          className="ml-auto text-xs text-muted-foreground hover:text-destructive"
        >
          Eliminar
        </button>
      </div>

      {showNotes && (
        <div className="space-y-1.5 pt-1">
          {app.notes?.map((n, i) => (
            <p key={i} className="text-xs text-muted-foreground">· {n.text}</p>
          ))}
          <div className="flex gap-2">
            <Input
              className="h-7 text-xs"
              placeholder="Escribe una nota..."
              value={noteValue}
              onChange={(e) => onNoteChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onNoteSubmit(); }}
            />
            <Button size="sm" className="h-7 text-xs" onClick={onNoteSubmit}>
              Guardar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});
