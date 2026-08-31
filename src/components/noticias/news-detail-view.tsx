"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  ExternalLink,
  Heart,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { NewsItem } from "@/lib/news/types";
import { PageHeader } from "@/components/page-header";
import { StudentHeaderActions } from "@/components/student-header-actions";
import { CatalogNextLink, CatalogPanel } from "@/components/catalog/catalog-card";
import { useTaskActions } from "@/features/tasks/client";
import {
  EmptyState,
  KIND_LABELS,
  TRUST_LABELS,
  formatDate,
  formatModule,
  formatTopic,
  newsHeroImage,
} from "@/components/noticias/noticias-view";

type DetailResponse = { item: NewsItem; nextItem: NewsItem | null };

type ViewState =
  | { status: "loading" }
  | { status: "loaded"; data: DetailResponse }
  | { status: "unavailable" }
  | { status: "unauthenticated" }
  | { status: "profile-incomplete" }
  | { status: "error" };

// News reads as an article, not as an operational record: the same catalogue
// shell as Courses and Events (breadcrumb -> PageHeader -> [reading column,
// sidebar] -> next item), but the main column is a narrow measure with an
// editorial serif headline and the supporting blocks sit inline in the
// reading flow instead of a three-column grid.
const ARTICLE_STYLES = `
  .al-news-title { font-family: Georgia, "Times New Roman", serif; font-weight: 500; letter-spacing: -0.01em; }
  .al-news-article { max-width: 680px; }
  .al-news-kicker { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; font-size: 12px; color: #9a958a; }
  .al-news-trust { display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; padding: 3px 9px; font-size: 11px; font-weight: 700; }
  .al-news-trust-official { background: #e7f5ee; color: #1f7a4d; }
  .al-news-trust-plain { background: #f3ece1; color: #6b6f72; }
  .al-news-lead { font-family: Georgia, "Times New Roman", serif; font-size: 16.5px; line-height: 1.7; color: #4b4740; }
  .al-news-body { font-size: 14.5px; line-height: 1.78; color: #333029; white-space: pre-wrap; }
  .al-news-callout { border-radius: 12px; padding: 14px 16px; }
  .al-news-callout-label { margin: 0 0 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .al-news-callout-facts { background: #fff8f4; border: 1px solid #f0d9cd; }
  .al-news-callout-facts .al-news-callout-label { color: #b94720; }
  .al-news-callout-why { background: #f0f7f3; border: 1px solid #d7e8df; }
  .al-news-callout-why .al-news-callout-label { color: #1f7a4d; }
  .al-news-facts-list { margin: 0; padding-left: 16px; font-size: 13px; line-height: 1.65; color: #4b4740; }
  .al-news-facts-list li { margin-top: 4px; }
  .al-news-chips { display: flex; flex-wrap: wrap; gap: 5px; }
  .al-news-chip { border-radius: 6px; padding: 3px 8px; font-size: 11px; }
  .al-news-chip-topic { background: #f3ece1; color: #6b6f72; }
  .al-news-chip-module { background: #eef4f1; color: #1f6a4c; }
  .al-news-actions { display: flex; flex-direction: column; gap: 8px; }
`;

export function NewsDetailView({ id }: { id: string }) {
  const actions = useTaskActions();
  const [state, setState] = useState<ViewState>({ status: "loading" });
  const [saving, setSaving] = useState(false);
  const [taskCreated, setTaskCreated] = useState(false);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch(`/api/news/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (response.status === 404 || response.status === 400) {
        setState({ status: "unavailable" });
        return;
      }
      if (response.status === 401) {
        setState({ status: "unauthenticated" });
        return;
      }
      if (response.status === 409) {
        setState({ status: "profile-incomplete" });
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as DetailResponse;
      setState({ status: "loaded", data: payload });
      if (payload.item.status === "new") {
        void fetch(`/api/news/${encodeURIComponent(id)}/read`, { method: "PATCH" }).catch(() => undefined);
      }
    } catch (error) {
      console.warn("[noticias/detail] load error", error);
      setState({ status: "error" });
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveItem() {
    if (state.status !== "loaded" || state.data.item.status === "saved" || saving) return;
    setSaving(true);
    const previous = state.data;
    setState({ status: "loaded", data: { ...previous, item: { ...previous.item, status: "saved" } } });
    try {
      const response = await fetch(`/api/news/${encodeURIComponent(id)}/save`, { method: "PATCH" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      toast.success("Noticia guardada");
    } catch {
      setState({ status: "loaded", data: previous });
      toast.error("No se pudo guardar la noticia");
    } finally {
      setSaving(false);
    }
  }

  function createTask() {
    if (state.status !== "loaded" || taskCreated) return;
    const title = state.data.item.title;
    void actions
      .addTask({ title: `Revisar: ${title}`, status: "pendiente", priority: "media", description: "Noticia" })
      .then(() => {
        setTaskCreated(true);
        toast.success("Tarea creada");
      })
      .catch(() => toast.error("No se pudo crear la tarea"));
  }

  if (state.status === "loading") {
    return <EmptyState icon={RefreshCw} title="Cargando noticia..." />;
  }

  if (state.status === "unavailable") {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState
          icon={Search}
          title="Esta noticia no está disponible"
          description="Puede que ya no exista, haya caducado sin guardarse o no corresponda a tu ciclo formativo."
        />
      </div>
    );
  }

  if (state.status === "unauthenticated") {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState
          icon={AlertTriangle}
          title="Tu sesión ha caducado"
          description="Vuelve a iniciar sesión para seguir viendo esta noticia."
        />
        <p className="text-center">
          <Link href="/login" className="text-sm font-semibold text-[#c94f21] hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    );
  }

  if (state.status === "profile-incomplete") {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState
          icon={AlertTriangle}
          title="Falta completar tu perfil"
          description="Necesitamos tu ciclo formativo para mostrarte esta noticia."
        />
        <p className="text-center">
          <Link href="/onboarding" className="text-sm font-semibold text-[#c94f21] hover:underline">
            Completar perfil
          </Link>
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="space-y-4">
        <BackLink />
        <div role="alert" className="rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-bold text-[#111111]">No hemos podido cargar esta noticia</p>
          <p className="mt-1 text-xs leading-5 text-[#6b6f72]">
            Puede ser un problema temporal de conexión. Inténtalo de nuevo.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="al-action-soft mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition"
          >
            <RefreshCw className="h-4 w-4" /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  const { item, nextItem } = state.data;
  const isOfficial = item.trustTier === "official" || item.trustTier === "institutional";
  const short = item.summaryShort?.trim() || undefined;
  const long = item.summaryExpanded?.trim() || item.description?.trim() || undefined;
  const lead = short && long && short !== long ? short : undefined;
  const body = long ?? short;
  const hasSource = Boolean(item.url && item.url.trim());
  const hasTags = item.topics.length > 0 || item.moduleCodes.length > 0;

  return (
    <div className="space-y-5">
      <style>{ARTICLE_STYLES}</style>
      <BackLink />

      <PageHeader
        eyebrow={KIND_LABELS[item.kind]}
        title={<span className="al-news-title">{item.title}</span>}
        actions={
          <div className="hidden md:flex md:items-center md:gap-2">
            <StudentHeaderActions />
          </div>
        }
      />

      <div className="al-news-kicker">
        <span className={cn("al-news-trust", isOfficial ? "al-news-trust-official" : "al-news-trust-plain")}>
          <ShieldCheck className="h-3.5 w-3.5" />
          {TRUST_LABELS[item.trustTier]}
        </span>
        {item.publishedAt && <span>Publicada · {formatDate(item.publishedAt)}</span>}
        {item.sourceUpdatedAt && <span>Actualizada · {formatDate(item.sourceUpdatedAt)}</span>}
        {item.verifiedAt && <span>Verificada · {formatDate(item.verifiedAt)}</span>}
        {(item.locality || item.province) && (
          <span>{[item.locality, item.province].filter(Boolean).join(", ")}</span>
        )}
        <span>{item.sourceName}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_252px]">
        <article className="al-news-article min-w-0 space-y-4">
          <div className="al-catalog-hero-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={newsHeroImage(item)} alt="" />
          </div>

          {lead && <p className="al-news-lead">{lead}</p>}
          {body ? (
            <p className="al-news-body">{body}</p>
          ) : (
            !item.keyFacts.length && (
              <p className="al-news-body text-[#6b6f72]">
                Todavía estamos recopilando el detalle de esta noticia. Abre la fuente original para el texto completo.
              </p>
            )
          )}

          {item.keyFacts.length > 0 && (
            <section aria-labelledby="news-key-facts" className="al-news-callout al-news-callout-facts">
              <p id="news-key-facts" className="al-news-callout-label">Datos confirmados</p>
              <ul className="al-news-facts-list">
                {item.keyFacts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </section>
          )}

          {item.whyRelevant && (
            <aside className="al-news-callout al-news-callout-why">
              <p className="al-news-callout-label">Por qué puede interesarte</p>
              <p className="text-sm leading-6 text-[#3a4a42]">{item.whyRelevant}</p>
            </aside>
          )}
        </article>

        <aside className="space-y-4">
          <CatalogPanel>
            <div>
              <p className="al-catalog-info-k">Fuente</p>
              <p className="al-catalog-info-v">{item.sourceName}</p>
              <p className="mt-1 text-[11.5px] leading-5 text-[#6b6f72]">
                {isOfficial ? "Publicación oficial verificada por Radar." : "Fuente verificada por Radar."}
              </p>
            </div>

            {item.expiresAt && (
              <div>
                <p className="al-catalog-info-k">Disponible hasta</p>
                <p className="al-catalog-info-v">{formatDate(item.expiresAt)}</p>
              </div>
            )}

            <div className="al-news-actions">
              {hasSource && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="al-catalog-action al-catalog-action-solid"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Leer noticia original
                </a>
              )}
              <button
                type="button"
                onClick={() => void saveItem()}
                disabled={item.status === "saved" || saving}
                aria-pressed={item.status === "saved"}
                className={cn("al-catalog-action", item.status === "saved" && "al-catalog-action-soft")}
              >
                <Heart className="h-3.5 w-3.5" fill={item.status === "saved" ? "currentColor" : "none"} />
                {item.status === "saved" ? "Guardada" : "Guardar"}
              </button>
              <button type="button" onClick={createTask} disabled={taskCreated} className="al-catalog-action">
                <Plus className="h-3.5 w-3.5" />
                {taskCreated ? "Tarea creada" : "Crear tarea"}
              </button>
            </div>

            {hasTags && (
              <div>
                <p className="al-catalog-info-k">Temas y módulos</p>
                <div className="al-news-chips mt-1.5">
                  {item.topics.map((topic) => (
                    <span key={topic} className="al-news-chip al-news-chip-topic">
                      #{formatTopic(topic)}
                    </span>
                  ))}
                  {item.moduleCodes.map((moduleCode) => (
                    <span key={moduleCode} className="al-news-chip al-news-chip-module">
                      {formatModule(moduleCode)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CatalogPanel>

          {nextItem && (
            <CatalogPanel>
              <p className="al-catalog-side-title">Siguiente noticia para tu ciclo</p>
              <CatalogNextLink
                href={`/noticias/${encodeURIComponent(nextItem.id)}`}
                title={nextItem.title}
                meta={nextItem.sourceName}
                actionLabel="Ver noticia"
              />
            </CatalogPanel>
          )}
        </aside>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/noticias"
      className="inline-flex items-center gap-1 text-xs font-semibold text-[#6b6f72] transition hover:text-[#c94f21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E15D2D]"
    >
      <ChevronLeft className="h-3.5 w-3.5" />
      Volver a Noticias
    </Link>
  );
}
