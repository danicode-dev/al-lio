"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { LANDING_MODULES } from "@/components/landing/modules";

type BeamPath = { d: string };

// "Everything connects to AL-LÍO": eight module nodes down the sides, the
// app mark in the centre, and SVG beams recomputed from the real node
// geometry (ResizeObserver). The beams trace themselves in once when the
// section scrolls into view, then a slow glowing dot loops along each. The
// same layout renders at every width - smaller on a phone - so the picture
// reads the same there. On desktop each node reveals its one-line
// description on hover/focus; the page repeats those lines as a list below
// for touch.
export function EcosystemDiagram() {
  const stageRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [paths, setPaths] = useState<BeamPath[]>([]);
  const [inView, setInView] = useState(false);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const stage = stageRef.current;
    const hub = hubRef.current;
    if (!stage || !hub) return;

    const recompute = () => {
      const stageRect = stage.getBoundingClientRect();
      if (stageRect.width === 0) return;
      const hubRect = hub.getBoundingClientRect();
      const hubLeft = hubRect.left - stageRect.left;
      const hubRight = hubRect.right - stageRect.left;
      const hubTop = hubRect.top - stageRect.top;
      // Spread the beam endpoints down each edge of the hub instead of
      // piling every curve onto the exact centre, so they don't knot.
      const perSide: Record<"left" | "right", number> = { left: 0, right: 0 };
      const next = LANDING_MODULES.flatMap((module, index) => {
        const node = nodeRefs.current[index];
        if (!node) return [];
        const rect = node.getBoundingClientRect();
        const start = {
          x: rect.left - stageRect.left + rect.width / 2,
          y: rect.top - stageRect.top + rect.height / 2,
        };
        const sideIndex = perSide[module.side]++;
        const spread = [0.22, 0.42, 0.58, 0.78][sideIndex] ?? 0.5;
        const end = {
          x: module.side === "left" ? hubLeft + 8 : hubRight - 8,
          y: hubTop + hubRect.height * spread,
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

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(stage);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      io.disconnect();
    };
  }, []);

  // After the beams have traced in, a single soft light travels one beam
  // at a time, cycling round the ring of modules - calm and deliberate,
  // not eight dots at once. Held back entirely when the visitor asked for
  // reduced motion.
  useEffect(() => {
    if (!inView || paths.length === 0) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setPulse((current) => (current + 1) % paths.length), 2100);
    return () => window.clearInterval(id);
  }, [inView, paths.length]);

  const left = LANDING_MODULES.map((module, index) => ({ module, index })).filter(({ module }) => module.side === "left");
  const right = LANDING_MODULES.map((module, index) => ({ module, index })).filter(({ module }) => module.side === "right");

  return (
    <div ref={stageRef} className="relative mx-auto max-w-[1120px]" aria-label="Los módulos de AL-LÍO conectados">
      <style>{`
        @keyframes al-eco-draw { to { stroke-dashoffset: 0; } }
        @keyframes al-eco-pulse {
          0% { opacity: 0; transform: scale(0.6); }
          14% { opacity: 1; transform: scale(1); }
          86% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.6); }
        }
        .al-eco-trace { stroke-dasharray: 1; stroke-dashoffset: 1; animation: al-eco-draw 1.9s cubic-bezier(0.33, 1, 0.68, 1) forwards; }
        .al-eco-pulse { animation: al-eco-pulse 1.7s ease-in-out both; }
        @media (prefers-reduced-motion: reduce) {
          .al-eco-trace { animation: none; stroke-dashoffset: 0; }
          .al-eco-pulse { display: none; }
        }
      `}</style>

      <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="al-eco-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e15d2d" stopOpacity="0.4" />
            <stop offset="0.5" stopColor="#e15d2d" />
            <stop offset="1" stopColor="#e9a23b" />
          </linearGradient>
          <filter id="al-eco-glow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="2.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Faint structure, always visible so the layout is not empty on load. */}
        {paths.map((path, index) => (
          <path key={`base-${index}`} d={path.d} fill="none" stroke="#e0d2b8" strokeWidth="1.6" strokeLinecap="round" />
        ))}

        {/* Trace-on: each terracotta beam draws itself once when in view. */}
        {inView &&
          paths.map((path, index) => (
            <path
              key={`trace-${index}`}
              className="al-eco-trace"
              d={path.d}
              pathLength={1}
              fill="none"
              stroke="url(#al-eco-gradient)"
              strokeWidth="3"
              strokeLinecap="round"
              style={{ animationDelay: `${index * 0.12}s` }}
            />
          ))}

        {/* One soft light travelling a single beam at a time, round the ring. */}
        {inView && paths[pulse] && (
          <circle key={pulse} className="al-eco-pulse" r="4.2" fill="#E15D2D" filter="url(#al-eco-glow)">
            <animateMotion dur="1.5s" begin="0s" fill="freeze" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1" path={paths[pulse].d} />
          </circle>
        )}
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

        <div ref={hubRef} className="relative flex items-center justify-center">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -z-10 h-[240px] w-[240px] rounded-full bg-[radial-gradient(circle,rgba(225,93,45,0.22),transparent_68%)] blur-lg"
          />
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

      <div
        role="tooltip"
        className={`pointer-events-none absolute bottom-[calc(100%+12px)] z-20 hidden w-[248px] translate-y-1 rounded-xl border border-[#ece4d5] bg-[#fffdf8] p-3.5 opacity-0 shadow-[0_18px_44px_rgba(90,60,25,0.16)] transition-[opacity,transform] duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 lg:block ${
          align === "end" ? "right-0" : "left-0"
        }`}
      >
        <p className="text-[12.5px] font-semibold text-[#b94720]">{module.label}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#5b564c]">{module.description}</p>
        <span
          className={`absolute top-full -mt-[5px] h-2.5 w-2.5 rotate-45 border-b border-r border-[#ece4d5] bg-[#fffdf8] ${
            align === "end" ? "right-5" : "left-5"
          }`}
        />
      </div>
    </div>
  );
}
