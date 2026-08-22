"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Layers, HelpCircle, ArrowRight, PartyPopper, SlidersHorizontal } from "lucide-react";
import { moduleCompletion, type RoadmapModule } from "@/lib/fp/roadmap";
import type { FpCompetencyEtapa } from "@/lib/db/types";

const ETAPA_META: Record<FpCompetencyEtapa, { label: string; color: string; bg: string }> = {
  "0_antes_de_empezar": { label: "Antes de empezar", color: "#6b6f72", bg: "#f3ece1" },
  "1_fundamentos": { label: "Fundamentos", color: "#2f5fac", bg: "#e6eefc" },
  "2_aplicacion": { label: "Aplicación", color: "#E15D2D", bg: "#fbe7dd" },
  "3_empleabilidad": { label: "Empleabilidad", color: "#b4791f", bg: "#fdf1dd" },
  "4_proyecto": { label: "Proyecto", color: "#1f7a4d", bg: "#e7f5ee" },
};

export function RoadmapView({ cycleName, modules }: { cycleName: string; modules: RoadmapModule[] }) {
  const [onlyMandatory, setOnlyMandatory] = useState(false);
  const [prioritizePending, setPrioritizePending] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);

  const allSkills = useMemo(() => modules.flatMap((mod) => mod.skills), [modules]);
  const totalSkills = allSkills.length;
  const completedSkills = allSkills.filter((skill) => skill.status === "completado").length;
  const completedPercent = totalSkills > 0 ? Math.round((completedSkills / totalSkills) * 100) : 0;
  const mandatoryPending = allSkills.filter((skill) => skill.obligatoria && skill.status !== "completado").length;
  const sinContenido = allSkills.filter((skill) => skill.status === "sin_contenido").length;
  const modulesDone = modules.filter((mod) => moduleCompletion(mod, false).percent === 100).length;

  const heroModule = useMemo(() => modules.find((mod) => moduleCompletion(mod, false).percent < 100) ?? null, [modules]);
  const heroCompletion = heroModule ? moduleCompletion(heroModule, false) : null;
  const heroNextSkill = heroModule?.skills.find((skill) => skill.status !== "completado") ?? heroModule?.skills[0] ?? null;
  const heroHref = heroModule
    ? `/roadmap/${encodeURIComponent(heroModule.codigo)}${heroNextSkill ? `?paso=${encodeURIComponent(heroNextSkill.id)}` : ""}`
    : "#";

  const avanceSkills = onlyMandatory ? allSkills.filter((skill) => skill.obligatoria) : allSkills;
  const avanceTotal = avanceSkills.length;
  const avanceCompleted = avanceSkills.filter((skill) => skill.status === "completado").length;
  const avancePercent = avanceTotal > 0 ? Math.round((avanceCompleted / avanceTotal) * 100) : 0;

  function ordenarModulos(list: RoadmapModule[]) {
    let filtered = list;
    if (onlyMandatory) filtered = filtered.filter((mod) => mod.skills.some((skill) => skill.obligatoria));
    if (hideCompleted) filtered = filtered.filter((mod) => moduleCompletion(mod, onlyMandatory).percent < 100);

    const sorted = [...filtered];
    if (prioritizePending) {
      sorted.sort((a, b) => {
        const aDone = moduleCompletion(a, onlyMandatory).percent === 100 ? 1 : 0;
        const bDone = moduleCompletion(b, onlyMandatory).percent === 100 ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return a.ordenGlobal - b.ordenGlobal;
      });
    } else {
      sorted.sort((a, b) => a.ordenGlobal - b.ordenGlobal);
    }
    return sorted;
  }

  // Show cycle-specific modules first, followed by transversal modules shared
  // across different cycle families, so students do not see both groups mixed.
  const modulosPropios = ordenarModulos(modules.filter((mod) => !mod.esComun));
  const modulosComunes = ordenarModulos(modules.filter((mod) => mod.esComun));

  function renderGrid(list: RoadmapModule[]) {
    return (
      <div className="al-roadmap-grid">
        {list.map((mod) => {
          const completion = moduleCompletion(mod, onlyMandatory);
          const meta = ETAPA_META[mod.etapa];
          const hasMandatoryPending = mod.skills.some((skill) => skill.obligatoria && skill.status !== "completado");
          return (
            <Link key={mod.codigo} href={`/roadmap/${encodeURIComponent(mod.codigo)}`} className="al-roadmap-tile">
              <div className="al-roadmap-tile-top">
                <span className="al-roadmap-etapa-dot" style={{ background: meta.color }} />
                <span className="al-roadmap-tile-code">{mod.codigo !== "sin-modulo" ? mod.codigo : "—"} · {meta.label}</span>
              </div>
              <p className="al-roadmap-tile-title">{mod.nombre}</p>
              <div className="al-roadmap-tile-bar-track">
                <div
                  className="al-roadmap-tile-bar-fill"
                  style={{ width: `${completion.percent}%`, background: completion.percent === 100 ? "#1f7a4d" : "#E15D2D" }}
                />
              </div>
              <div className="al-roadmap-tile-footer">
                <span>{completion.completed}/{completion.total}</span>
                {hasMandatoryPending && !onlyMandatory && (
                  <span className="al-roadmap-tile-mandatory-badge">Obligatorio pendiente</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <style>{`
        .al-roadmap-header { margin-bottom: 20px; }
        .al-roadmap-eyebrow { font-size: 12.5px; font-weight: 700; color: #E15D2D; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 4px 0; }
        .al-roadmap-title { font-size: clamp(1.4rem, 2.2vw, 1.85rem); font-weight: 800; color: #111111; line-height: 1.2; margin: 0; font-family: var(--font-barlow, sans-serif); }
        .al-roadmap-subtitle { font-size: 13.5px; color: #6b6f72; margin: 4px 0 0 0; }

        .al-roadmap-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; }
        @media (min-width: 780px) { .al-roadmap-stats { grid-template-columns: repeat(4, 1fr); } }
        .al-roadmap-stat-card { display: flex; align-items: center; gap: 10px; background: white; border: 1px solid #ece7dc; border-radius: 16px; padding: 14px 16px; box-shadow: 0 10px 26px rgba(17, 17, 17, 0.045); }
        .al-roadmap-stat-icon { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0; }
        .al-roadmap-stat-value { font-size: 20px; font-weight: 800; color: #111111; line-height: 1.1; }
        .al-roadmap-stat-label { font-size: 11.5px; color: #6b6f72; margin-top: 1px; }

        .al-roadmap-hero { display: flex; align-items: center; gap: 18px; background: white; border: 1px solid #ece7dc; border-radius: 20px; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.06); padding: 20px; margin-bottom: 20px; flex-wrap: wrap; }
        .al-roadmap-hero-ring { width: 64px; height: 64px; border-radius: 999px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .al-roadmap-hero-ring-inner { width: 50px; height: 50px; border-radius: 999px; background: white; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #111111; }
        .al-roadmap-hero-body { flex: 1; min-width: 220px; }
        .al-roadmap-hero-eyebrow { font-size: 11.5px; font-weight: 700; color: #6b6f72; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 4px 0; }
        .al-roadmap-hero-title { font-size: 17px; font-weight: 800; color: #111111; margin: 0 0 4px 0; }
        .al-roadmap-hero-desc { font-size: 13px; color: #6b6f72; margin: 0; }
        .al-roadmap-hero-cta {
          display: inline-flex; align-items: center; gap: 7px; height: 40px; flex-shrink: 0; border-radius: 12px; border: none;
          cursor: pointer; padding: 0 18px; font-size: 13.5px; font-weight: 700; color: white; text-decoration: none;
          background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); box-shadow: 0 10px 24px rgba(225, 93, 45, 0.22); transition: filter 0.15s;
        }
        .al-roadmap-hero-cta:hover { filter: brightness(1.08); }
        .al-roadmap-hero-cta-icon { width: 15px; height: 15px; }

        .al-roadmap-avance { background: white; border: 1px solid #ece7dc; border-radius: 20px; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.06); padding: 18px 20px; margin-bottom: 22px; }
        .al-roadmap-avance-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
        .al-roadmap-avance-heading { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #111111; }
        .al-roadmap-avance-heading svg { width: 15px; height: 15px; color: #6b6f72; }
        .al-roadmap-avance-value { font-size: 13px; font-weight: 700; color: #1f7a4d; }
        .al-roadmap-avance-bar { width: 100%; height: 8px; border-radius: 999px; background: #f0ece2; overflow: hidden; margin-bottom: 14px; }
        .al-roadmap-avance-bar-fill { height: 100%; background: linear-gradient(90deg, #4C9A6E, #1f7a4d); border-radius: 999px; transition: width 0.2s; }
        .al-roadmap-toggles { display: flex; flex-wrap: wrap; gap: 8px; }
        .al-roadmap-toggle {
          display: inline-flex; align-items: center; height: 32px; border-radius: 999px; border: 1px solid #e4dfd5; background: white;
          padding: 0 14px; font-size: 12.5px; font-weight: 600; color: #333029; cursor: pointer; transition: all 0.15s;
        }
        .al-roadmap-toggle:hover { border-color: #d8d1c2; }
        .al-roadmap-toggle-active { border-color: transparent; background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); color: white; }

        .al-roadmap-section { margin-bottom: 24px; }
        .al-roadmap-section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #6b6f72; margin: 0 0 14px 0; }

        .al-roadmap-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
        .al-roadmap-tile {
          display: flex; flex-direction: column; gap: 10px; background: white; border: 1px solid #ece7dc; border-radius: 18px;
          padding: 16px; box-shadow: 0 8px 20px rgba(17, 17, 17, 0.04); text-decoration: none; transition: transform 0.15s, box-shadow 0.15s;
        }
        .al-roadmap-tile:hover { transform: translateY(-2px); box-shadow: 0 14px 28px rgba(17, 17, 17, 0.08); }
        .al-roadmap-tile-top { display: flex; align-items: center; gap: 8px; }
        .al-roadmap-etapa-dot { width: 8px; height: 8px; border-radius: 999px; flex-shrink: 0; }
        .al-roadmap-tile-code { font-size: 11px; font-weight: 700; color: #6b6f72; letter-spacing: 0.02em; }
        .al-roadmap-tile-title { font-size: 14px; font-weight: 700; color: #111111; margin: 0; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .al-roadmap-tile-bar-track { width: 100%; height: 6px; border-radius: 999px; background: #f0ece2; overflow: hidden; }
        .al-roadmap-tile-bar-fill { height: 100%; border-radius: 999px; transition: width 0.2s; }
        .al-roadmap-tile-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11.5px; font-weight: 600; color: #6b6f72; }
        .al-roadmap-tile-mandatory-badge { font-size: 10.5px; font-weight: 700; color: #E15D2D; background: #fbe7dd; border-radius: 999px; padding: 2px 8px; }

        .al-roadmap-empty { text-align: center; padding: 48px 20px; color: #6b6f72; font-size: 13.5px; background: white; border: 1px solid #ece7dc; border-radius: 20px; }

        @media (max-width: 640px) { .al-roadmap-hero { flex-direction: column; align-items: flex-start; } .al-roadmap-hero-cta { width: 100%; justify-content: center; } }
      `}</style>

      <div className="al-roadmap-header">
        <p className="al-roadmap-eyebrow">Roadmap</p>
        <h1 className="al-roadmap-title">Tu ruta de competencias</h1>
        <p className="al-roadmap-subtitle">{cycleName}</p>
      </div>

      {modules.length === 0 ? (
        <div className="al-roadmap-empty">Todavía no hay competencias cargadas para tu ciclo.</div>
      ) : (
        <>
          <div className="al-roadmap-stats">
            <div className="al-roadmap-stat-card">
              <span className="al-roadmap-stat-icon" style={{ background: "#e7f5ee", color: "#1f7a4d" }}>
                <CheckCircle2 className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="al-roadmap-stat-value">{completedSkills} · {completedPercent}%</p>
                <p className="al-roadmap-stat-label">Completadas</p>
              </div>
            </div>
            <div className="al-roadmap-stat-card">
              <span className="al-roadmap-stat-icon" style={{ background: "#fdf1dd", color: "#b4791f" }}>
                <Clock className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="al-roadmap-stat-value">{mandatoryPending}</p>
                <p className="al-roadmap-stat-label">Obligatorias pendientes</p>
              </div>
            </div>
            <div className="al-roadmap-stat-card">
              <span className="al-roadmap-stat-icon" style={{ background: "#e6eefc", color: "#2f5fac" }}>
                <Layers className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="al-roadmap-stat-value">{modulesDone} de {modules.length}</p>
                <p className="al-roadmap-stat-label">Módulos completados</p>
              </div>
            </div>
            <div className="al-roadmap-stat-card">
              <span className="al-roadmap-stat-icon" style={{ background: "#f3ece1", color: "#6b6f72" }}>
                <HelpCircle className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="al-roadmap-stat-value">{sinContenido}</p>
                <p className="al-roadmap-stat-label">Sin contenido todavía</p>
              </div>
            </div>
          </div>

          {heroModule && heroCompletion ? (
            <div className="al-roadmap-hero">
              <div className="al-roadmap-hero-ring" style={{ background: `conic-gradient(#E15D2D ${heroCompletion.percent}%, #f0ece2 0)` }}>
                <div className="al-roadmap-hero-ring-inner">{heroCompletion.percent}%</div>
              </div>
              <div className="al-roadmap-hero-body">
                <p className="al-roadmap-hero-eyebrow">Módulo actual · {ETAPA_META[heroModule.etapa].label}</p>
                <h2 className="al-roadmap-hero-title">{heroModule.nombre}</h2>
                <p className="al-roadmap-hero-desc">{heroCompletion.completed} de {heroCompletion.total} competencias completadas</p>
              </div>
              <Link href={heroHref} className="al-roadmap-hero-cta">
                Continuar módulo
                <ArrowRight className="al-roadmap-hero-cta-icon" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="al-roadmap-hero">
              <div className="al-roadmap-hero-ring" style={{ background: "conic-gradient(#1f7a4d 100%, #f0ece2 0)" }}>
                <div className="al-roadmap-hero-ring-inner">
                  <PartyPopper className="h-5 w-5" style={{ color: "#1f7a4d" }} aria-hidden="true" />
                </div>
              </div>
              <div className="al-roadmap-hero-body">
                <p className="al-roadmap-hero-eyebrow">Ruta completa</p>
                <h2 className="al-roadmap-hero-title">Has completado todo tu Roadmap</h2>
                <p className="al-roadmap-hero-desc">Todas las competencias de {cycleName} están hechas. Puedes repasar cualquier módulo cuando quieras.</p>
              </div>
            </div>
          )}

          <div className="al-roadmap-avance">
            <div className="al-roadmap-avance-top">
              <span className="al-roadmap-avance-heading">
                <SlidersHorizontal aria-hidden="true" />
                Tu avance
              </span>
              <span className="al-roadmap-avance-value">{avanceCompleted} de {avanceTotal} · {avancePercent}%</span>
            </div>
            <div className="al-roadmap-avance-bar">
              <div className="al-roadmap-avance-bar-fill" style={{ width: `${avancePercent}%` }} />
            </div>
            <div className="al-roadmap-toggles">
              <button
                type="button"
                className={`al-roadmap-toggle ${onlyMandatory ? "al-roadmap-toggle-active" : ""}`}
                onClick={() => setOnlyMandatory((v) => !v)}
              >
                Solo obligatorias
              </button>
              <button
                type="button"
                className={`al-roadmap-toggle ${prioritizePending ? "al-roadmap-toggle-active" : ""}`}
                onClick={() => setPrioritizePending((v) => !v)}
              >
                Priorizar pendientes
              </button>
              <button
                type="button"
                className={`al-roadmap-toggle ${hideCompleted ? "al-roadmap-toggle-active" : ""}`}
                onClick={() => setHideCompleted((v) => !v)}
              >
                Ocultar completadas
              </button>
            </div>
          </div>

          {modulosPropios.length === 0 && modulosComunes.length === 0 ? (
            <div className="al-roadmap-empty">No hay módulos que coincidan con estos filtros.</div>
          ) : (
            <>
              {modulosPropios.length > 0 && (
                <div className="al-roadmap-section">
                  <p className="al-roadmap-section-title">Asignaturas de tu ciclo</p>
                  {renderGrid(modulosPropios)}
                </div>
              )}
              {modulosComunes.length > 0 && (
                <div className="al-roadmap-section">
                  <p className="al-roadmap-section-title">Módulos comunes a todos los ciclos</p>
                  {renderGrid(modulosComunes)}
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
