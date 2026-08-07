"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, ListPlus, MapPin, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getTechOpportunities, type TechOpportunity } from "@/lib/tech-opportunities/tech-opportunities";

type FilterId = "todos" | "cursos" | "hackathons" | "alta" | "granada" | "online";
export type TechOpportunityTaskTarget = "diario" | "pendiente" | "semanal";

type TechOpportunitiesSectionProps = {
  initialItems?: TechOpportunity[];
  onAddTask?: (item: TechOpportunity, target: TechOpportunityTaskTarget) => void;
  onComplete?: (item: TechOpportunity) => void;
};

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "cursos", label: "Cursos" },
  { id: "hackathons", label: "Hackathons / Eventos" },
  { id: "alta", label: "Alta prioridad" },
  { id: "granada", label: "Granada" },
  { id: "online", label: "Online" },
];

const TASK_TARGETS: Array<{ id: TechOpportunityTaskTarget; label: string }> = [
  { id: "diario", label: "Diario" },
  { id: "semanal", label: "Semanal" },
  { id: "pendiente", label: "Pendiente" },
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
      return items.filter((item) => CURSO_CATS.has(item.categoria?.toLowerCase() ?? ""));
    case "hackathons":
      return items.filter((item) => HACKATHON_CATS.has(item.categoria?.toLowerCase() ?? ""));
    case "alta":
      return items.filter((item) => item.prioridad?.toLowerCase() === "alta");
    case "granada":
      return items.filter((item) => item.provincia?.toLowerCase() === "granada");
    case "online":
      return items.filter((item) => {
        const modality = item.modalidad?.toLowerCase() ?? "";
        const location = item.localidad?.toLowerCase() ?? "";
        return modality.includes("online") || modality.includes("distancia") || location === "online";
      });
    default:
      return items;
  }
}

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

function hasCertification(item: TechOpportunity) {
  const value = item.certificacion_o_premio?.toLowerCase() ?? "";
  return value.length > 0 && value !== "no" && !value.startsWith("no consta") && !value.startsWith("no especif");
}

function hasPractices(item: TechOpportunity) {
  const value = (item.practicas_empresa ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return value.startsWith("si") || value.includes("beca formativa");
}

export function TechOpportunitiesSection({ initialItems, onAddTask, onComplete }: TechOpportunitiesSectionProps) {
  const [items, setItems] = useState<TechOpportunity[]>(initialItems ?? []);
  const [loading, setLoading] = useState(!initialItems);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>("todos");
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [addedTarget, setAddedTarget] = useState<{ slug: string; target: TechOpportunityTaskTarget } | null>(null);
  const [completedSlug, setCompletedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (initialItems) {
      setItems(initialItems);
      setLoading(false);
      return;
    }

    getTechOpportunities()
      .then(setItems)
      .catch((err: unknown) => setFetchError(err instanceof Error ? err.message : "Error al cargar oportunidades."))
      .finally(() => setLoading(false));
  }, [initialItems]);

  const filtered = useMemo(() => applyFilter(items, filter), [items, filter]);
  const queue = useMemo(() => {
    if (filtered.length <= 1) return [];
    return [1, 2].map((offset) => filtered[(activeIndex + offset) % filtered.length]).filter(Boolean);
  }, [activeIndex, filtered]);

  const next = useCallback(() => {
    setActiveIndex((value) => (filtered.length ? (value + 1) % filtered.length : 0));
  }, [filtered.length]);

  const previous = useCallback(() => {
    setActiveIndex((value) => (filtered.length ? (value - 1 + filtered.length) % filtered.length : 0));
  }, [filtered.length]);

  const handleAddTask = useCallback((item: TechOpportunity, target: TechOpportunityTaskTarget) => {
    onAddTask?.(item, target);
    setAddedTarget({ slug: item.id_slug, target });
    window.setTimeout(() => {
      setAddedTarget((current) => (
        current?.slug === item.id_slug && current.target === target ? null : current
      ));
    }, 2200);
  }, [onAddTask]);

  const handleComplete = useCallback((item: TechOpportunity) => {
    onComplete?.(item);
    setCompletedSlug(item.id_slug);
  }, [onComplete]);

  useEffect(() => {
    setActiveIndex(0);
  }, [filter, items]);

  useEffect(() => {
    if (paused || filtered.length <= 1) return;
    const id = window.setInterval(next, 3000);
    return () => window.clearInterval(id);
  }, [filtered.length, next, paused]);

  return (
    <section
      className="overflow-hidden rounded-lg border bg-card shadow-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex flex-col gap-3 border-b px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Oportunidades tech</h2>
            {!loading && !fetchError && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {filtered.length}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Seleccion rotativa de cursos, eventos y hackathons alineados con DAW.
          </p>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:max-w-[56%] md:justify-end md:pb-0">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "h-7 shrink-0 rounded-full px-2.5 text-xs font-medium transition-colors",
                filter === item.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="h-[190px] animate-pulse rounded-md bg-muted" />
          <div className="hidden space-y-2 md:block">
            <div className="h-[91px] animate-pulse rounded-md bg-muted" />
            <div className="h-[91px] animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      ) : fetchError ? (
        <p className="m-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          {fetchError}
        </p>
      ) : filtered.length === 0 ? (
        <p className="m-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Sin oportunidades para este filtro.
        </p>
      ) : (
        <div className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0">
            <div className="overflow-hidden rounded-md border bg-background">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${activeIndex * 100}%)` }}
              >
                {filtered.map((item, index) => (
                  <TechOpportunitySlide
                    key={item.id_slug}
                    item={item}
                    index={index}
                    total={filtered.length}
                    onAddTask={onAddTask ? handleAddTask : undefined}
                    addedTarget={addedTarget?.slug === item.id_slug ? addedTarget.target : null}
                    onComplete={onComplete ? handleComplete : undefined}
                    completed={completedSlug === item.id_slug}
                  />
                ))}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-1">
                {filtered.slice(0, 8).map((item, index) => (
                  <button
                    key={item.id_slug}
                    type="button"
                    aria-label={`Ver oportunidad ${index + 1}`}
                    onClick={() => setActiveIndex(index)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      index === activeIndex
                        ? "w-8 bg-primary"
                        : "w-2 bg-muted-foreground/25 hover:bg-muted-foreground/45",
                    )}
                  />
                ))}
                {filtered.length > 8 && (
                  <span className="ml-1 text-[11px] text-muted-foreground">+{filtered.length - 8}</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={previous} aria-label="Oportunidad anterior">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={next} aria-label="Siguiente oportunidad">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <aside className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
            {queue.map((item) => (
              <TechOpportunityQueueItem
                key={item.id_slug}
                item={item}
                onClick={() => setActiveIndex(filtered.findIndex((candidate) => candidate.id_slug === item.id_slug))}
              />
            ))}
          </aside>
        </div>
      )}
    </section>
  );
}

function TechOpportunitySlide({
  item,
  index,
  total,
  onAddTask,
  addedTarget,
  onComplete,
  completed,
}: {
  item: TechOpportunity;
  index: number;
  total: number;
  onAddTask?: (item: TechOpportunity, target: TechOpportunityTaskTarget) => void;
  addedTarget: TechOpportunityTaskTarget | null;
  onComplete?: (item: TechOpportunity) => void;
  completed: boolean;
}) {
  const isAlta = item.prioridad?.toLowerCase() === "alta";
  const isDaw5 = item.encaje_daw_1_5 === 5;
  const cert = hasCertification(item);
  const pract = hasPractices(item);
  const insight = item.requisitos_resumen || item.certificacion_o_premio || item.notas || "Revisa la fuente para confirmar plazos y requisitos.";

  return (
    <article className="flex min-h-[190px] min-w-full flex-col justify-between p-4">
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
            <span className="truncate text-xs font-medium text-muted-foreground">
              {formatCategory(item.categoria)}
            </span>
          </div>
          {item.prioridad && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                isAlta
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {item.prioridad}
            </span>
          )}
        </div>

        <h3 className="line-clamp-2 text-lg font-semibold leading-tight tracking-normal">
          {item.nombre}
        </h3>
        {item.entidad && (
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{item.entidad}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {compactLocation(item) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {compactLocation(item)}
            </span>
          )}
          {item.fecha_inicio && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {fmtDate(item.fecha_inicio)}
            </span>
          )}
          {item.modalidad && <span>{item.modalidad}</span>}
          {item.estado && <span className="font-medium text-foreground/70">{item.estado}</span>}
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {isDaw5 && <CompactBadge label="DAW 5/5" tone="amber" />}
          {cert && <CompactBadge label="Certificacion" tone="blue" />}
          {pract && <CompactBadge label="Practicas" tone="emerald" />}
          {item.coste && <CompactBadge label={item.coste} tone="neutral" />}
        </div>

        <p className="mt-3 line-clamp-2 max-w-[72ch] text-xs leading-5 text-muted-foreground">
          {insight}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {item.encaje_daw_1_5 != null ? (
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-3 w-3",
                  i < item.encaje_daw_1_5!
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/25",
                )}
              />
            ))}
            <span className="ml-1 text-[11px] text-muted-foreground">Encaje DAW</span>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">Pendiente de valorar</span>
        )}

        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          {onAddTask && (
            <div className="flex flex-wrap items-center gap-1 rounded-md border bg-muted/35 p-1">
              <span className="hidden px-1 text-[11px] font-medium text-muted-foreground sm:inline-flex">
                To-do
              </span>
              {TASK_TARGETS.map((target, targetIndex) => {
                const isAdded = addedTarget === target.id;
                return (
                  <Button
                    key={target.id}
                    type="button"
                    size="sm"
                    variant={isAdded ? "default" : "ghost"}
                    className="h-7 px-2 text-[11px]"
                    onClick={() => onAddTask(item, target.id)}
                    title={`Agregar a ${target.label}`}
                  >
                    {isAdded ? (
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    ) : targetIndex === 0 ? (
                      <ListPlus className="mr-1 h-3.5 w-3.5" />
                    ) : null}
                    {isAdded ? "Añadido" : target.label}
                  </Button>
                );
              })}
            </div>
          )}

          {onComplete && (
            <Button
              type="button"
              size="sm"
              variant={completed ? "default" : "ghost"}
              className="h-8 px-2.5 text-xs"
              onClick={() => onComplete(item)}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              {completed ? "Realizado" : "Hecho"}
            </Button>
          )}

          {item.fuente_url && (
            <Button asChild size="sm" variant="outline" className="h-8 px-3 text-xs">
              <a href={item.fuente_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Fuente
              </a>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function TechOpportunityQueueItem({
  item,
  onClick,
}: {
  item: TechOpportunity;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group min-h-[91px] rounded-md border bg-background/70 p-3 text-left transition-colors hover:bg-muted/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium uppercase text-muted-foreground">
          {formatCategory(item.categoria)}
        </span>
        {item.prioridad && (
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {item.prioridad}
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug group-hover:text-primary">
        {item.nombre}
      </p>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        {item.fecha_inicio && <span>{fmtDate(item.fecha_inicio)}</span>}
        {compactLocation(item) && <span className="truncate">{compactLocation(item)}</span>}
      </div>
    </button>
  );
}

function CompactBadge({ label, tone }: { label: string; tone: "amber" | "blue" | "emerald" | "neutral" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "amber" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
        tone === "blue" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
        tone === "emerald" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
        tone === "neutral" && "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function formatCategory(value: string | null) {
  if (!value) return "Oportunidad";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function compactLocation(item: TechOpportunity) {
  return [item.localidad, item.provincia]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(", ");
}
