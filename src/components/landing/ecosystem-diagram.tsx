"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { LANDING_MODULES } from "@/components/landing/modules";

type BeamPath = { d: string };

// "Everything connects to AL-LÍO". Above lg it is a wide diagram: eight
// module nodes down the sides, the app mark in the centre, and animated
// SVG beams recomputed from the real node geometry (ResizeObserver) with a
// tooltip per node on hover/focus. Below lg it collapses to a single
// column that still moves - a flowing line and a travelling dot run down
// through the cards - so the motion is visible on a phone too.
export function EcosystemDiagram() {
  return (
    <>
      <style>{`
        @keyframes al-eco-flow { to { stroke-dashoffset: -520; } }
        .al-eco-flow { stroke-dasharray: 96 440; animation: al-eco-flow 3.2s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .al-eco-flow { animation: none; stroke-dasharray: none; opacity: 0.5; }
          .al-eco-dot { display: none; }
        }
      `}</style>
      <DesktopDiagram />
      <MobileDiagram />
    </>
  );
}

function Hub({ size, caption }: { size: number; caption?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <Image
        src="/assets/al_lio_icon_black.png"
        alt=""
        width={size}
        height={size}
        className="rounded-[26px] shadow-[0_26px_54px_rgba(17,17,17,0.22)]"
        priority
      />
      {caption && (
        <div className="text-center">
          <p className="font-[family-name:var(--font-barlow)] text-[15px] font-black tracking-[0.04em] text-[#17150f]">AL-LÍO</p>
          <p className="text-[11px] text-[#8a857c]">Tu curso, conectado</p>
        </div>
      )}
    </div>
  );
}

function DesktopDiagram() {
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

  const left = LANDING_MODULES.map((module, index) => ({ module, index })).filter(({ module }) => module.side === "left");
  const right = LANDING_MODULES.map((module, index) => ({ module, index })).filter(({ module }) => module.side === "right");

  return (
    <div ref={stageRef} className="relative mx-auto hidden max-w-[1040px] lg:block" aria-label="Los módulos de AL-LÍO conectados">
      <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="al-eco-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e15d2d" stopOpacity="0.1" />
            <stop offset="0.5" stopColor="#e15d2d" />
            <stop offset="1" stopColor="#e9a23b" />
          </linearGradient>
        </defs>
        {paths.map((path, index) => (
          <path key={`base-${index}`} d={path.d} fill="none" stroke="#e7ddca" strokeWidth="1.8" />
        ))}
        {paths.map((path, index) => (
          <path
            key={`flow-${index}`}
            className="al-eco-flow"
            d={path.d}
            fill="none"
            stroke="url(#al-eco-gradient)"
            strokeWidth="2.4"
            strokeLinecap="round"
            style={{ animationDelay: `${index * -0.42}s` }}
          />
        ))}
        {paths.map((path, index) =>
          index % 2 === 0 ? (
            <circle key={`dot-${index}`} className="al-eco-dot" r="3.2" fill={index % 4 === 0 ? "#E15D2D" : "#E9A23B"}>
              <animateMotion dur={`${3.8 + (index % 3) * 0.3}s`} begin={`${index * -0.6}s`} repeatCount="indefinite" path={path.d} />
            </circle>
          ) : null,
        )}
      </svg>

      <div className="relative z-10 grid h-[420px] grid-cols-[1fr_auto_1fr] items-center gap-28">
        <div className="flex flex-col gap-5">
          {left.map(({ module, index }) => (
            <DiagramNode
              key={module.label}
              module={module}
              align="start"
              nodeRef={(node) => {
                nodeRefs.current[index] = node;
              }}
            />
          ))}
        </div>
        <div ref={hubRef}>
          <Hub size={132} caption />
        </div>
        <div className="flex flex-col items-end gap-5">
          {right.map(({ module, index }) => (
            <DiagramNode
              key={module.label}
              module={module}
              align="end"
              nodeRef={(node) => {
                nodeRefs.current[index] = node;
              }}
            />
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
        <span className="text-[13px] font-semibold text-[#35322c]">{module.label}</span>
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-[calc(100%+10px)] z-20 w-[240px] rounded-[10px] bg-[#17150f] px-3 py-2.5 text-[11.5px] leading-snug text-[#efe9df] opacity-0 shadow-[0_14px_30px_rgba(17,17,17,0.22)] transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${
          align === "end" ? "right-0" : "left-0"
        }`}
      >
        <span className="mb-0.5 block text-[12px] font-semibold text-white">{module.label}</span>
        {module.description}
      </span>
    </div>
  );
}

function MobileDiagram() {
  return (
    <div className="lg:hidden">
      <div className="flex justify-center">
        <Hub size={92} />
      </div>
      <div className="relative mt-6 pl-8">
        <svg
          className="pointer-events-none absolute bottom-3 left-[13px] top-3 w-3 overflow-visible"
          viewBox="0 0 12 1000"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="al-eco-gradient-v" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e15d2d" stopOpacity="0.1" />
              <stop offset="0.5" stopColor="#e15d2d" />
              <stop offset="1" stopColor="#e9a23b" />
            </linearGradient>
          </defs>
          <path d="M 6 0 L 6 1000" fill="none" stroke="#e7ddca" strokeWidth="1.6" />
          <path className="al-eco-flow" d="M 6 0 L 6 1000" fill="none" stroke="url(#al-eco-gradient-v)" strokeWidth="2.4" strokeLinecap="round" />
          <circle className="al-eco-dot" r="3" fill="#E15D2D">
            <animateMotion dur="6s" repeatCount="indefinite" path="M 6 0 L 6 1000" />
          </circle>
        </svg>
        <ul className="space-y-3">
          {LANDING_MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <li key={module.label} className="flex gap-3 rounded-2xl border border-[#EBE4D6] bg-white p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#fbe7dd] text-[#E15D2D]">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-[#35322c]">{module.label}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[#77726a]">{module.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
