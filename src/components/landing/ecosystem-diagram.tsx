"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { LANDING_MODULES } from "@/components/landing/modules";

type BeamPath = { d: string };

// "Everything connects to AL-LÍO": eight module nodes down the sides, the
// app mark in the centre, and animated SVG beams recomputed from the real
// node geometry (ResizeObserver). The same layout renders at every width -
// smaller on a phone - so the connected picture reads the same there. On
// desktop each node also reveals its one-line description on hover/focus;
// the landing page repeats those lines as a plain list below for touch.
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

  const left = LANDING_MODULES.map((module, index) => ({ module, index })).filter(({ module }) => module.side === "left");
  const right = LANDING_MODULES.map((module, index) => ({ module, index })).filter(({ module }) => module.side === "right");

  return (
    <div ref={stageRef} className="relative mx-auto max-w-[1120px]" aria-label="Los módulos de AL-LÍO conectados">
      <style>{`
        @keyframes al-eco-flow { to { stroke-dashoffset: -520; } }
        .al-eco-flow { stroke-dasharray: 110 300; animation: al-eco-flow 3.2s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .al-eco-flow { animation: none; stroke-dasharray: none; opacity: 0.7; }
          .al-eco-dot { display: none; }
        }
      `}</style>

      <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="al-eco-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e15d2d" stopOpacity="0.35" />
            <stop offset="0.5" stopColor="#e15d2d" />
            <stop offset="1" stopColor="#e9a23b" />
          </linearGradient>
          <filter id="al-eco-glow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {paths.map((path, index) => (
          <path key={`base-${index}`} d={path.d} fill="none" stroke="#d8c9ac" strokeWidth="2.4" strokeLinecap="round" />
        ))}
        {paths.map((path, index) => (
          <path
            key={`flow-${index}`}
            className="al-eco-flow"
            d={path.d}
            fill="none"
            stroke="url(#al-eco-gradient)"
            strokeWidth="3.4"
            strokeLinecap="round"
            style={{ animationDelay: `${index * -0.4}s` }}
          />
        ))}
        {paths.map((path, index) => (
          <circle key={`dot-${index}`} className="al-eco-dot" r="4.4" fill={index % 2 === 0 ? "#E15D2D" : "#E9A23B"} filter="url(#al-eco-glow)">
            <animateMotion dur={`${3.8 + (index % 3) * 0.35}s`} begin={`${index * -0.55}s`} repeatCount="indefinite" path={path.d} />
          </circle>
        ))}
      </svg>

      <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:h-[460px] sm:gap-8 xl:gap-16">
        <div className="flex flex-col items-start gap-3 sm:gap-6">
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

        <div ref={hubRef} className="flex items-center justify-center">
          <Image
            src="/assets/al_lio_icon_black.png"
            alt="AL-LÍO"
            width={156}
            height={156}
            priority
            className="h-16 w-16 rounded-[18px] shadow-[0_20px_44px_rgba(17,17,17,0.22)] sm:h-[152px] sm:w-[152px] sm:rounded-[28px]"
          />
        </div>

        <div className="flex flex-col items-end gap-3 sm:gap-6">
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
        className="flex items-center gap-2 rounded-xl border border-[#e9e2d3] bg-white py-1.5 pl-1.5 pr-2.5 shadow-[0_10px_22px_rgba(90,60,25,0.07)] outline-none transition-[border-color,box-shadow] duration-200 hover:border-[#efc7b4] hover:shadow-[0_14px_30px_rgba(185,71,32,0.14)] focus-visible:border-[#efc7b4] focus-visible:ring-2 focus-visible:ring-[#e15d2d]/30 sm:gap-3 sm:py-2.5 sm:pl-2.5 sm:pr-4"
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[8px] bg-[#fbe7dd] text-[#E15D2D] sm:h-8 sm:w-8 sm:rounded-[9px]">
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
        </span>
        <span className="text-left text-[11px] font-semibold leading-tight text-[#35322c] sm:text-[13px]">{module.label}</span>
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-[calc(100%+10px)] z-20 hidden w-[240px] rounded-[10px] bg-[#17150f] px-3 py-2.5 text-[11.5px] leading-snug text-[#efe9df] opacity-0 shadow-[0_14px_30px_rgba(17,17,17,0.22)] transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 lg:block ${
          align === "end" ? "right-0" : "left-0"
        }`}
      >
        <span className="mb-0.5 block text-[12px] font-semibold text-white">{module.label}</span>
        {module.description}
      </span>
    </div>
  );
}
