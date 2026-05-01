"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, ExternalLink, Info, MapPin, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTechOpportunities, type TechOpportunity } from "@/lib/tech-opportunities";

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------
type FilterId = "todos" | "cursos" | "hackathons" | "alta" | "granada" | "online";

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "cursos", label: "Cursos" },
  { id: "hackathons", label: "Hackathons / Eventos" },
  { id: "alta", label: "Alta prioridad" },
  { id: "granada", label: "Granada" },
  { id: "online", label: "Online" },
];

const CURSO_CATS = new Set(["curso", "fp"]);
const HACKATHON_CATS = new Set([
  "hackathon_reto",
  "evento_tech",
  "reto_programacion",
  "concurso_programacion",
]);

function applyFilter(items: TechOpportunity[], filter: FilterId): TechOpportunity[] {
  switch (filter) {
    case "cursos":
      return items.filter((i) => CURSO_CATS.has(i.categoria?.toLowerCase() ?? ""));
    case "hackathons":
      return items.filter((i) => HACKATHON_CATS.has(i.categoria?.toLowerCase() ?? ""));
    case "alta":
      return items.filter((i) => i.prioridad?.toLowerCase() === "alta");
    case "granada":
      return items.filter((i) => i.provincia?.toLowerCase() === "granada");
    case "online":
      return items.filter((i) => {
        const m = i.modalidad?.toLowerCase() ?? "";
        const l = i.localidad?.toLowerCase() ?? "";
        return m.includes("online") || m.includes("distancia") || l === "online";
      });
    default:
      return items;
  }
}

// ---------------------------------------------------------------------------
// Date formatter
// ---------------------------------------------------------------------------
function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------
function hasCertification(item: TechOpportunity) {
  const v = item.certificacion_o_premio?.toLowerCase() ?? "";
  return v.length > 0 && v !== "no" && !v.startsWith("no consta") && !v.startsWith("no especif");
}

function hasPractices(item: TechOpportunity) {
  const v = (item.practicas_empresa ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return v.startsWith("si") || v.includes("beca formativa");
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------
export function TechOpportunitiesSection({ initialItems }: { initialItems?: TechOpportunity[] }) {
  const [items, setItems] = useState<TechOpportunity[]>(initialItems ?? []);
  const [loading, setLoading] = useState(!initialItems);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>("todos");
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (initialItems) {
      setItems(initialItems);
      setLoading(false);
      return;
    }
    getTechOpportunities()
      .then(setItems)
      .catch((err: unknown) =>
        setFetchError(
          err instanceof Error ? err.message : "Error al cargar oportunidades."
        )
      )
      .finally(() => setLoading(false));
  }, [initialItems]);

  const filtered = useMemo(() => applyFilter(items, filter), [items, filter]);

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Oportunidades tech</h2>
          <p className="text-sm text-muted-foreground">
            Cursos, eventos y hackathons alineados con DAW.
          </p>
        </div>
        {!loading && !fetchError && (
          <span className="mt-0.5 shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {filtered.length}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setFilter(f.id);
              setExpandedSlug(null);
            }}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-md border bg-muted"
            />
          ))}
        </div>
      ) : fetchError ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          {fetchError}
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Sin oportunidades para este filtro.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {filtered.map((item) => (
            <TechOpportunityCard
              key={item.id_slug}
              item={item}
              expanded={expandedSlug === item.id_slug}
              onToggle={() =>
                setExpandedSlug((prev) =>
                  prev === item.id_slug ? null : item.id_slug
                )
              }
            />
          ))}
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
function TechOpportunityCard({
  item,
  expanded,
  onToggle,
}: {
  item: TechOpportunity;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isAlta = item.prioridad?.toLowerCase() === "alta";
  const isDaw5 = item.encaje_daw_1_5 === 5;
  const cert = hasCertification(item);
  const pract = hasPractices(item);
  const tags = item.tags?.split("|").map((t) => t.trim()).filter(Boolean) ?? [];

  return (
    <div
      className={cn(
        "rounded-md border bg-background/70 p-3 shadow-sm transition-all",
        expanded && "ring-1 ring-primary/20"
      )}
    >
      {/* Badges */}
      {(isAlta || isDaw5 || cert || pract) && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {isAlta && (
            <span className="inline-flex rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
              Alta prioridad
            </span>
          )}
          {isDaw5 && (
            <span className="inline-flex rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              DAW 5/5
            </span>
          )}
          {cert && (
            <span className="inline-flex rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              Certificación
            </span>
          )}
          {pract && (
            <span className="inline-flex rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              Prácticas
            </span>
          )}
        </div>
      )}

      {/* Title + entity */}
      <p className="text-sm font-medium leading-snug">{item.nombre}</p>
      {item.entidad && (
        <p className="mt-0.5 text-xs text-muted-foreground">{item.entidad}</p>
      )}

      {/* Meta */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
        {item.localidad && (
          <span className="flex items-center gap-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            {item.localidad}
          </span>
        )}
        {item.modalidad && <span>{item.modalidad}</span>}
        {item.fecha_inicio && (
          <span className="flex items-center gap-0.5">
            <Calendar className="h-3 w-3 shrink-0" />
            {fmtDate(item.fecha_inicio)}
          </span>
        )}
        {item.estado && (
          <span className="font-medium text-foreground/70">{item.estado}</span>
        )}
      </div>

      {/* DAW stars */}
      {item.encaje_daw_1_5 != null && (
        <div className="mt-1.5 flex items-center gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className={cn(
                "h-2.5 w-2.5",
                i < item.encaje_daw_1_5!
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/25"
              )}
            />
          ))}
          <span className="ml-1 text-[10px] text-muted-foreground">
            Encaje DAW
          </span>
        </div>
      )}

      {/* Expanded detail panel */}
      {expanded && (
        <div className="mt-3 space-y-2 rounded-md border border-dashed bg-muted/30 p-2.5">
          {item.coste && <InfoRow label="Coste" value={item.coste} />}
          {item.requisitos_resumen && (
            <InfoRow label="Requisitos" value={item.requisitos_resumen} />
          )}
          {(item.horas_totales || item.horas_practicas) && (
            <InfoRow
              label="Horas"
              value={[
                item.horas_totales ? `${item.horas_totales}h totales` : null,
                item.horas_practicas
                  ? `${item.horas_practicas}h prácticas`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          )}
          {item.certificacion_o_premio && (
            <InfoRow label="Certificación" value={item.certificacion_o_premio} />
          )}
          {tags.length > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase text-muted-foreground">
                Tags
              </p>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {tags.slice(0, 10).map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-muted px-1.5 py-0.5 text-[10px]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {item.notas && <InfoRow label="Notas" value={item.notas} />}
          {item.ultima_revision && (
            <InfoRow label="Revisado" value={fmtDate(item.ultima_revision)} />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-2 flex items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={onToggle}
        >
          {expanded ? (
            <>
              <X className="mr-1 h-3.5 w-3.5" />
              Cerrar
            </>
          ) : (
            <>
              <Info className="mr-1 h-3.5 w-3.5" />
              Info
            </>
          )}
        </Button>

        {item.fuente_url && (
          <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
            <a
              href={item.fuente_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Fuente
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p className="text-xs">{value}</p>
    </div>
  );
}
