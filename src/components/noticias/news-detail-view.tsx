"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, BookmarkCheck, CheckCircle2, ExternalLink, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { NewsItem } from "@/lib/news/types";
import {
  EmptyState,
  KIND_LABELS,
  TRUST_LABELS,
  formatDate,
  formatModule,
  formatTopic,
} from "@/components/noticias/noticias-view";

type DetailResponse = { item: NewsItem; related: NewsItem[] };

type ViewState =
  | { status: "loading" }
  | { status: "loaded"; data: DetailResponse }
  | { status: "unavailable" }
  | { status: "unauthenticated" }
  | { status: "profile-incomplete" }
  | { status: "error" };

export function NewsDetailView({ id }: { id: string }) {
  const [state, setState] = useState<ViewState>({ status: "loading" });
  const [saving, setSaving] = useState(false);

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
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#E15D2D] px-4 text-sm font-bold text-white transition hover:bg-[#c94f21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E15D2D] focus-visible:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4" /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  const { item, related } = state.data;
  const summary = item.description?.trim();
  const hasSource = Boolean(item.url && item.url.trim());

  return (
    <div className="space-y-5">
      <BackLink />

      <article className="space-y-4 rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_8px_20px_rgba(17,17,17,0.04)] sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
          <span className="text-[#6b6f72]">{item.sourceName}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5",
              item.trustTier === "official" || item.trustTier === "institutional"
                ? "bg-[#e7f5ee] text-[#1f7a4d]"
                : "bg-[#f3ece1] text-[#6b6f72]",
            )}
          >
            {TRUST_LABELS[item.trustTier]}
          </span>
          <span className="rounded-full bg-[#fbe7dd] px-2 py-0.5 text-[#c94f21]">{KIND_LABELS[item.kind]}</span>
          {item.status === "saved" && (
            <span className="rounded-full bg-[#fdf1dd] px-2 py-0.5 text-[#9a6418]">Guardada</span>
          )}
        </div>

        <h1 className="text-xl font-semibold leading-6 text-[#111111] sm:text-2xl">{item.title}</h1>

        <p className="text-xs text-[#9a958a]">
          {item.publishedAt ? formatDate(item.publishedAt) : "Fecha no indicada"}
          {item.province ? ` · ${item.province}` : ""}
        </p>

        <p className="text-sm leading-6 text-[#333029]">
          {summary || "Todavía no hay un resumen disponible para esta noticia. Consulta la fuente original para más detalle."}
        </p>

        {(item.topics.length > 0 || item.moduleCodes.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {item.topics.map((topic) => (
              <span key={topic} className="rounded-md bg-[#f3ece1] px-2 py-1 text-[10px] text-[#6b6f72]">
                #{formatTopic(topic)}
              </span>
            ))}
            {item.moduleCodes.map((moduleCode) => (
              <span key={moduleCode} className="rounded-md bg-[#eef4f1] px-2 py-1 text-[10px] text-[#1f6a4c]">
                {formatModule(moduleCode)}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-[#f0ece2] pt-4 sm:flex-row sm:items-center">
          {hasSource ? (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#E15D2D] px-5 text-sm font-semibold text-white transition hover:bg-[#c94f21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E15D2D] focus-visible:ring-offset-2"
            >
              Leer noticia original
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <span className="inline-flex h-11 items-center justify-center rounded-xl border border-[#ece7dc] bg-[#faf8f3] px-5 text-sm font-semibold text-[#9a958a]">
              Fuente no disponible
            </span>
          )}
          <button
            type="button"
            onClick={() => void saveItem()}
            disabled={item.status === "saved" || saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#ece7dc] bg-white px-5 text-sm font-semibold text-[#333029] transition hover:border-[#efb79f] hover:text-[#c94f21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E15D2D] focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {item.status === "saved" ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-[#1f7a4d]" /> Guardada
              </>
            ) : (
              <>
                <BookmarkCheck className="h-4 w-4" /> Guardar
              </>
            )}
          </button>
        </div>
      </article>

      {related.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-[#333029]">Relacionadas para tu ciclo</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((relatedItem) => (
              <Link
                key={relatedItem.id}
                href={`/noticias/${relatedItem.id}`}
                className="rounded-xl border border-[#ece7dc] bg-white p-3 text-xs font-semibold leading-5 text-[#333029] transition hover:border-[#efb79f] hover:text-[#c94f21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E15D2D]"
              >
                {relatedItem.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/noticias"
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6b6f72] hover:text-[#c94f21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E15D2D]"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Volver a Noticias
    </Link>
  );
}
