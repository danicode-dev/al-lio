"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LANDING_MODULES } from "@/components/landing/modules";

type BeamPath = { d: string };

// A guided tour of "everything connects to AL-LÍO": eight module nodes down
// the sides, the app mark in the centre, and SVG beams recomputed from the
// real node geometry (ResizeObserver). Once in view a single dot travels
// one beam at a time, in order. Each time it reaches the hub the arriving
// module lights up green with a check and its one-line description opens
// above the mark. After the last one the whole thing resets and runs
// again. On xl+ each node also shows its line on hover; smaller screens get
// the list underneath. Held still for reduced motion.
const N = LANDING_MODULES.length;
const STEP_MS = 2100;
const DOT_MS = 1.5;

type Seq = { run: number; traveling: number; done: number; hub: number };
const SEQ_START: Seq = { run: 0, traveling: 0, done: 0, hub: -1 };

export function EcosystemDiagram() {
  const stageRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [paths, setPaths] = useState<BeamPath[]>([]);
  const [inView, setInView] = useState(false);
  const [seq, setSeq] = useState<Seq>(SEQ_START);

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

  // The guided sequence: advance one module every STEP_MS. When the dot
  // reaches the hub the module that was in flight is marked done and shown
  // above the mark; once all eight are connected, hold one beat and reset.
  useEffect(() => {
    if (!inView || paths.length === 0) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setSeq((prev) => {
        if (prev.done >= N) return { ...SEQ_START, run: prev.run + 1 };
        const arrived = prev.traveling;
        return { run: prev.run + 1, traveling: (arrived + 1) % N, done: arrived + 1, hub: arrived };
      });
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [inView, paths.length]);

  const left = LANDING_MODULES.map((module, index) => ({ module, index })).filter(({ module }) => module.side === "left");
  const right = LANDING_MODULES.map((module, index) => ({ module, index })).filter(({ module }) => module.side === "right");
  const dotPath = inView && seq.done < N ? paths[seq.traveling] : undefined;
  const hubModule = seq.hub >= 0 ? LANDING_MODULES[seq.hub] : null;

  return (
    <div ref={stageRef} className="relative mx-auto max-w-[900px]" aria-label="Los módulos de AL-LÍO conectados">
      <style>{`
        @keyframes al-eco-draw { to { stroke-dashoffset: 0; } }
        @keyframes al-eco-pulse { 0% { opacity: 0; } 12% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } }
        .al-eco-trace { stroke-dasharray: 1; stroke-dashoffset: 1; animation: al-eco-draw 1.9s cubic-bezier(0.33, 1, 0.68, 1) forwards; }
        .al-eco-pulse { animation: al-eco-pulse ${DOT_MS}s linear forwards; }
        .al-eco-tip p, .al-eco-hub p { text-shadow: 0 0 6px #F6F1E6, 0 0 6px #F6F1E6, 0 0 12px #F6F1E6, 0 1px 0 #F6F1E6; }
        .al-eco-hub { opacity: 0; transition: opacity 0.25s; }
        .al-eco-hub[data-show="true"] { opacity: 1; }
        @media (prefers-reduced-motion: reduce) {
          .al-eco-trace { animation: none; stroke-dashoffset: 0; }
          .al-eco-pulse { display: none; }
          .al-eco-hub { display: none; }
        }
      `}</style>

      <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="al-eco-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e15d2d" stopOpacity="0.35" />
            <stop offset="0.5" stopColor="#e15d2d" />
            <stop offset="1" stopColor="#d24f21" />
          </linearGradient>
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

        {/* A connected beam stays lit green behind its node. */}
        {inView &&
          paths.map((path, index) =>
            index < seq.done ? (
              <path
                key={`done-${index}`}
                d={path.d}
                fill="none"
                stroke="#1f7a4d"
                strokeOpacity="0.9"
                strokeWidth="3"
                strokeLinecap="round"
              />
            ) : null,
          )}

        {/* One ink dot travels a single beam at a time, module -> hub. */}
        {dotPath && (
          <circle key={seq.run} className="al-eco-pulse" r="4" fill="#2c2620">
            <animateMotion
              dur={`${DOT_MS}s`}
              begin="0s"
              fill="freeze"
              keyPoints="0;1"
              keyTimes="0;1"
              calcMode="spline"
              keySplines="0.4 0 0.2 1"
              path={dotPath.d}
            />
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
              done={inView && index < seq.done}
              nodeRef={(node) => {
                nodeRefs.current[index] = node;
              }}
            />
          ))}
        </div>

        <div ref={hubRef} className="relative flex items-center justify-center">
          {/* The arriving module's line, opened above the mark. */}
          <div
            className="al-eco-hub pointer-events-none absolute bottom-[calc(100%+14px)] left-1/2 hidden w-[220px] -translate-x-1/2 text-center sm:block"
            data-show={hubModule ? "true" : "false"}
            aria-hidden="true"
          >
            <p className="text-[13.5px] font-semibold text-[#b94720]">{hubModule?.label ?? ""}</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#6f6a5f]">{hubModule?.description ?? ""}</p>
          </div>

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
              done={inView && index < seq.done}
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
  done,
}: {
  module: (typeof LANDING_MODULES)[number];
  nodeRef: (node: HTMLDivElement | null) => void;
  align: "start" | "end";
  done: boolean;
}) {
  const Icon = module.icon;
  return (
    <div ref={nodeRef} className="group relative">
      <button
        type="button"
        className={`flex items-center gap-2 rounded-xl border bg-white py-1.5 pl-1.5 pr-2.5 shadow-[0_10px_22px_rgba(90,60,25,0.07)] outline-none transition-colors duration-300 hover:shadow-[0_14px_30px_rgba(185,71,32,0.14)] focus-visible:ring-2 focus-visible:ring-[#e15d2d]/30 sm:gap-3 sm:py-2.5 sm:pl-2.5 sm:pr-4 ${
          done ? "border-[#bfe3cf]" : "border-[#e9e2d3] hover:border-[#efc7b4] focus-visible:border-[#efc7b4]"
        }`}
      >
        <span
          className={`relative grid h-6 w-6 shrink-0 place-items-center rounded-[8px] transition-colors duration-300 sm:h-8 sm:w-8 sm:rounded-[9px] ${
            done ? "bg-[#e6f4ec] text-[#1f7a4d]" : "bg-[#fbe7dd] text-[#E15D2D]"
          }`}
        >
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
          {done && (
            <span className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-[#1f7a4d] text-white shadow-sm">
              <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
            </span>
          )}
        </span>
        <span
          className={`text-left text-[12px] font-semibold leading-tight transition-colors duration-300 sm:text-[13.5px] ${
            done ? "text-[#1f7a4d]" : "text-[#35322c]"
          }`}
        >
          {module.label}
        </span>
      </button>

      {/* Floating text, no card: the copy lifts off the background with a
          soft cream halo instead of sitting inside a box. It opens outward
          - away from the hub and the beams - centred on its node, in the
          margin the narrowed stage leaves free. Shown only where that
          margin exists (xl+); below that the page lists the same copy. */}
      <div
        role="tooltip"
        className={`al-eco-tip pointer-events-none absolute top-1/2 z-20 hidden w-[184px] -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 xl:block ${
          align === "end" ? "left-[calc(100%+14px)] text-left" : "right-[calc(100%+14px)] text-right"
        }`}
      >
        <p className="text-[13.5px] font-semibold text-[#b94720]">{module.label}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#6f6a5f]">{module.description}</p>
      </div>
    </div>
  );
}
