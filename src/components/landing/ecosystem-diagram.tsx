"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { LANDING_MODULES } from "@/components/landing/modules";

type BeamPath = { d: string };

// The desktop-only "everything connects to AL-LÍO" diagram: eight module
// nodes down the sides, a central hub, and animated SVG beams recomputed
// from the real node geometry so the layout can flex. The mobile fallback
// is a plain stacked list rendered by the landing page itself, so this
// component is hidden below lg and never needs a touch story.
export function EcosystemDiagram() {
  const stageRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [paths, setPaths] = useState<BeamPath[]>([]);

  useEffect(() => {
    const stage = stageRef.current;
    const hub = hubRef.current;
    if (!stage || !hub) return;

    const recompute = () => {
      const stageRect = stage.getBoundingClientRect();
      if (stageRect.width === 0) return;
      const hubRect = hub.getBoundingClientRect();
      const end = {
        x: hubRect.left - stageRect.left + hubRect.width / 2,
        y: hubRect.top - stageRect.top + hubRect.height / 2,
      };

      const next = LANDING_MODULES.flatMap((_, index) => {
        const node = nodeRefs.current[index];
        if (!node) return [];
        const rect = node.getBoundingClientRect();
        const start = {
          x: rect.left - stageRect.left + rect.width / 2,
          y: rect.top - stageRect.top + rect.height / 2,
        };
        const midX = (start.x + end.x) / 2;
        return [{ d: `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}` }];
      });
      setPaths(next);
    };

    const frame = requestAnimationFrame(recompute);
    const observer = new ResizeObserver(recompute);
    observer.observe(stage);
    observer.observe(hub);
    nodeRefs.current.forEach((node) => node && observer.observe(node));
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const leftModules = LANDING_MODULES.map((module, index) => ({ module, index })).filter(({ module }) => module.side === "left");
  const rightModules = LANDING_MODULES.map((module, index) => ({ module, index })).filter(({ module }) => module.side === "right");

  return (
    <div
      ref={stageRef}
      className="al-eco relative mx-auto hidden max-w-[940px] lg:block"
      aria-label="Los módulos de AL-LÍO conectados"
    >
      <style>{`
        @keyframes al-eco-flow { to { stroke-dashoffset: -510; } }
        .al-eco-flow { stroke-dasharray: 90 420; animation: al-eco-flow 3s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .al-eco-flow { animation: none; stroke-dasharray: none; opacity: 0.55; }
          .al-eco-dot { display: none; }
        }
      `}</style>

      <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="al-eco-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e15d2d" stopOpacity="0.1" />
            <stop offset="0.5" stopColor="#e15d2d" />
            <stop offset="1" stopColor="#e9a23b" />
          </linearGradient>
        </defs>
        {paths.map((path, index) => (
          <path key={`base-${index}`} d={path.d} fill="none" stroke="#e7ddca" strokeWidth="1.7" />
        ))}
        {paths.map((path, index) => (
          <path
            key={`flow-${index}`}
            className="al-eco-flow"
            d={path.d}
            fill="none"
            stroke="url(#al-eco-gradient)"
            strokeWidth="2.1"
            strokeLinecap="round"
            style={{ animationDelay: `${index * -0.4}s` }}
          />
        ))}
        {paths.map((path, index) =>
          index % 2 === 0 ? (
            <circle key={`dot-${index}`} className="al-eco-dot" r="3" fill={index % 4 === 0 ? "#E15D2D" : "#E9A23B"}>
              <animateMotion dur={`${3.6 + (index % 3) * 0.3}s`} begin={`${index * -0.6}s`} repeatCount="indefinite" path={path.d} />
            </circle>
          ) : null,
        )}
      </svg>

      <div className="relative z-10 grid h-[380px] grid-cols-[1fr_auto_1fr] items-center gap-24">
        <div className="flex flex-col gap-5">
          {leftModules.map(({ module, index }) => (
            <DiagramNode key={module.label} module={module} nodeRef={(node) => {
                nodeRefs.current[index] = node;
              }} align="start" />
          ))}
        </div>

        <div
          ref={hubRef}
          className="flex flex-col items-center gap-1 rounded-[22px] bg-[#0f1417] px-8 py-7 text-center shadow-[0_26px_54px_rgba(17,17,17,0.22)]"
        >
          <Image src="/assets/al_lio_symbol_transparent.png" alt="" width={42} height={40} />
          <span className="mt-1.5 font-[family-name:var(--font-barlow)] text-[16px] font-black tracking-[0.04em] text-[#f2efea]">AL-LÍO</span>
          <span className="text-[10px] text-[#8b9193]">Tu curso, conectado</span>
        </div>

        <div className="flex flex-col items-end gap-5">
          {rightModules.map(({ module, index }) => (
            <DiagramNode key={module.label} module={module} nodeRef={(node) => {
                nodeRefs.current[index] = node;
              }} align="end" />
          ))}
        </div>
      </div>
    </div>
  );
}

function DiagramNode({
  module,
  nodeRef,
  align,
}: {
  module: (typeof LANDING_MODULES)[number];
  nodeRef: (node: HTMLDivElement | null) => void;
  align: "start" | "end";
}) {
  const Icon = module.icon;
  return (
    <div ref={nodeRef} className="group relative">
      <button
        type="button"
        className="flex items-center gap-3 rounded-xl border border-[#e9e2d3] bg-white py-2.5 pl-2.5 pr-4 shadow-[0_10px_22px_rgba(90,60,25,0.06)] outline-none transition-[border-color,box-shadow] duration-200 hover:border-[#efc7b4] hover:shadow-[0_14px_30px_rgba(185,71,32,0.14)] focus-visible:border-[#efc7b4] focus-visible:ring-2 focus-visible:ring-[#e15d2d]/30"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-[#fbe7dd] text-[#E15D2D]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="text-[12.5px] font-semibold text-[#35322c]">{module.label}</span>
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-[calc(100%+10px)] z-20 w-[230px] rounded-[10px] bg-[#17150f] px-3 py-2.5 text-[11.5px] leading-snug text-[#efe9df] opacity-0 shadow-[0_14px_30px_rgba(17,17,17,0.22)] transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${
          align === "end" ? "right-0" : "left-0"
        }`}
      >
        <span className="mb-0.5 block text-[12px] font-semibold text-white">{module.label}</span>
        {module.description}
      </span>
    </div>
  );
}
