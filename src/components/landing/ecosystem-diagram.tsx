"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LANDING_MODULES } from "@/components/landing/modules";

type BeamPath = { d: string };

// A guided tour of "everything connects to AL-LÍO". Once in view the beams
// are drawn ONE AT A TIME: a line grows from a module to the centre mark,
// and only when it arrives does that module turn green with a check, its
// beam stay green, and its one-line description open above the mark. Then
// the next module. After the eighth it holds a beat and starts over. The
// module chips are not interactive - the description always appears at the
// hub. Held still for reduced motion (every beam shown static instead).
const N = LANDING_MODULES.length;
const STEP_MS = 2100;
const DRAW_S = 1.35;
const HOLD_MS = 1500;

type Seq = { key: number; drawing: number; done: number; hub: number };
const SEQ_IDLE: Seq = { key: 0, drawing: -1, done: 0, hub: -1 };

export function EcosystemDiagram() {
  const stageRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [paths, setPaths] = useState<BeamPath[]>([]);
  const [inView, setInView] = useState(false);
  const [seq, setSeq] = useState<Seq>(SEQ_IDLE);

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

  // Draw the beams one at a time: line grows -> arrives -> module goes
  // green and its line opens at the hub -> next module -> ... -> hold -> loop.
  useEffect(() => {
    if (!inView || paths.length === 0) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let phase = 0;
    let cancelled = false;
    let drawTimer = 0;
    let stepTimer = 0;
    let k = 1;

    const startStep = () => {
      if (cancelled) return;
      setSeq({ key: k++, drawing: phase, done: phase, hub: -1 });
      drawTimer = window.setTimeout(() => {
        if (cancelled) return;
        setSeq({ key: k++, drawing: phase, done: phase + 1, hub: phase });
      }, DRAW_S * 1000);
      stepTimer = window.setTimeout(() => {
        if (cancelled) return;
        phase += 1;
        if (phase >= N) {
          setSeq({ key: k++, drawing: -1, done: N, hub: N - 1 });
          stepTimer = window.setTimeout(() => {
            phase = 0;
            startStep();
          }, HOLD_MS);
        } else {
          startStep();
        }
      }, STEP_MS);
    };

    startStep();
    return () => {
      cancelled = true;
      window.clearTimeout(drawTimer);
      window.clearTimeout(stepTimer);
    };
  }, [inView, paths.length]);

  const left = LANDING_MODULES.map((module, index) => ({ module, index })).filter(({ module }) => module.side === "left");
  const right = LANDING_MODULES.map((module, index) => ({ module, index })).filter(({ module }) => module.side === "right");
  const hubModule = seq.hub >= 0 ? LANDING_MODULES[seq.hub] : null;
  const drawingPath = seq.drawing >= 0 ? paths[seq.drawing] : undefined;

  return (
    <div ref={stageRef} className="relative mx-auto max-w-[900px]" aria-label="Los módulos de AL-LÍO conectados">
      <style>{`
        @keyframes al-eco-grow { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes al-eco-pulse { 0% { opacity: 0; } 10% { opacity: 1; } 92% { opacity: 1; } 100% { opacity: 0; } }
        .al-eco-active { stroke-dasharray: 1; stroke-dashoffset: 1; animation: al-eco-grow ${DRAW_S}s ease-in-out forwards; }
        .al-eco-dot { animation: al-eco-pulse ${DRAW_S}s linear forwards; }
        .al-eco-hub p { text-shadow: 0 0 6px #F6F1E6, 0 0 6px #F6F1E6, 0 0 12px #F6F1E6, 0 1px 0 #F6F1E6; }
        .al-eco-hub { opacity: 0; transition: opacity 0.25s; }
        .al-eco-hub[data-show="true"] { opacity: 1; }
        @media (prefers-reduced-motion: reduce) {
          .al-eco-active { animation: none; stroke-dashoffset: 0; }
          .al-eco-dot { display: none; }
          .al-eco-hub { display: none; }
        }
      `}</style>

      <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible" aria-hidden="true">
        {/* Reduced motion / not yet started: show the whole structure static
            so the picture still reads as connected. */}
        {(!inView || seq.drawing < 0) && seq.done === 0 &&
          paths.map((path, index) => (
            <path key={`static-${index}`} d={path.d} fill="none" stroke="#e0d2b8" strokeWidth="1.8" strokeLinecap="round" />
          ))}

        {/* Beams already connected stay green. */}
        {paths.map((path, index) =>
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

        {/* The one beam currently growing, module -> hub. */}
        {drawingPath && (
          <path
            key={`draw-${seq.key}`}
            className="al-eco-active"
            d={drawingPath.d}
            pathLength={1}
            fill="none"
            stroke="#e15d2d"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}

        {/* A dot rides the tip of the growing line. */}
        {drawingPath && (
          <circle key={`dot-${seq.key}`} className="al-eco-dot" r="4" fill="#2c2620">
            <animateMotion
              dur={`${DRAW_S}s`}
              begin="0s"
              fill="freeze"
              keyPoints="0;1"
              keyTimes="0;1"
              calcMode="spline"
              keySplines="0.42 0 0.58 1"
              path={drawingPath.d}
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
  done,
}: {
  module: (typeof LANDING_MODULES)[number];
  nodeRef: (node: HTMLDivElement | null) => void;
  done: boolean;
}) {
  const Icon = module.icon;
  return (
    <div
      ref={nodeRef}
      className={`flex items-center gap-2 rounded-xl border bg-white py-1.5 pl-1.5 pr-2.5 shadow-[0_10px_22px_rgba(90,60,25,0.07)] transition-colors duration-300 sm:gap-3 sm:py-2.5 sm:pl-2.5 sm:pr-4 ${
        done ? "border-[#bfe3cf]" : "border-[#e9e2d3]"
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
    </div>
  );
}
