"use client";

import Image from "next/image";
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
const DRAW_S = 1.35; // line-growth duration (kept - this is the speed that was liked)
const DWELL_MS = 3200; // how long the arriving module's line stays open at the hub
const HOLD_MS = 2200; // pause with everything connected before the loop restarts

// `active` is the module whose line is currently growing (-1 = none, e.g.
// while the description is being read or during the end hold). `done` is
// how many have connected. `cycle` bumps every loop so keys remount.
type Seq = { cycle: number; active: number; done: number; hub: number };
const SEQ_IDLE: Seq = { cycle: 0, active: -1, done: 0, hub: -1 };

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
        // Anchor the beam to the node's hub-facing edge (where its icon
        // sits), not the middle of the icon+label pair.
        const start = {
          x: (module.side === "left" ? rect.right - 12 : rect.left + 12) - stageRect.left,
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

  // One beam at a time: it grows (DRAW_S) -> on arrival the module turns
  // green and its line opens at the hub, held DWELL_MS to read -> next
  // module -> ... -> everything connected, hold -> restart. The growing
  // green line is dropped the instant the module connects, so it can
  // never linger half-drawn on top of the green one.
  useEffect(() => {
    if (!inView || paths.length === 0) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let phase = 0;
    let cycle = 0;
    let cancelled = false;
    let growTimer = 0;
    let nextTimer = 0;

    const grow = () => {
      if (cancelled) return;
      setSeq({ cycle, active: phase, done: phase, hub: -1 });
      growTimer = window.setTimeout(() => {
        if (cancelled) return;
        setSeq({ cycle, active: -1, done: phase + 1, hub: phase }); // connected
        nextTimer = window.setTimeout(() => {
          if (cancelled) return;
          phase += 1;
          if (phase >= N) {
            nextTimer = window.setTimeout(() => {
              cycle += 1;
              phase = 0;
              grow();
            }, HOLD_MS);
          } else {
            grow();
          }
        }, DWELL_MS);
      }, DRAW_S * 1000);
    };

    grow();
    return () => {
      cancelled = true;
      window.clearTimeout(growTimer);
      window.clearTimeout(nextTimer);
    };
  }, [inView, paths.length]);

  const left = LANDING_MODULES.map((module, index) => ({ module, index })).filter(({ module }) => module.side === "left");
  const right = LANDING_MODULES.map((module, index) => ({ module, index })).filter(({ module }) => module.side === "right");
  const hubModule = seq.hub >= 0 ? LANDING_MODULES[seq.hub] : null;
  const growingPath = seq.active >= 0 ? paths[seq.active] : undefined;

  return (
    <div ref={stageRef} className="relative mx-auto max-w-[900px]" aria-label="Los módulos de AL-LÍO conectados">
      <style>{`
        @keyframes al-eco-grow { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes al-eco-underline { from { width: 0; } to { width: 100%; } }
        .al-eco-active { stroke-dasharray: 1; stroke-dashoffset: 1; animation: al-eco-grow ${DRAW_S}s ease-in-out forwards; }
        .al-eco-underline { animation: al-eco-underline ${DRAW_S}s ease-in-out forwards; }
        .al-eco-hub p { text-shadow: 0 0 6px #F7F3EC, 0 0 6px #F7F3EC, 0 0 12px #F7F3EC, 0 1px 0 #F7F3EC; }
        .al-eco-hub, .al-eco-hub-m { opacity: 0; transition: opacity 0.25s; }
        .al-eco-hub[data-show="true"], .al-eco-hub-m[data-show="true"] { opacity: 1; }
        @media (prefers-reduced-motion: reduce) {
          .al-eco-active { animation: none; stroke-dashoffset: 0; }
          .al-eco-underline { animation: none; width: 0; }
          .al-eco-hub, .al-eco-hub-m { display: none; }
        }
      `}</style>

      <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible" aria-hidden="true">
        {/* Reduced motion / not yet started: show the whole structure static
            so the picture still reads as connected. */}
        {(!inView || (seq.active < 0 && seq.done === 0)) &&
          paths.map((path, index) => (
            <path key={`static-${index}`} d={path.d} fill="none" stroke="#E6DED2" strokeWidth="1.8" strokeLinecap="round" />
          ))}

        {/* Beams already connected stay green. */}
        {paths.map((path, index) =>
          index < seq.done ? (
            <path
              key={`done-${index}`}
              d={path.d}
              fill="none"
              stroke="#1F5B46"
              strokeOpacity="0.9"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ) : null,
        )}

        {/* The one beam currently growing, module -> hub. Keyed by cycle +
            module so it only ever mounts once per pass. */}
        {growingPath && (
          <path
            key={`grow-${seq.cycle}-${seq.active}`}
            className="al-eco-active"
            d={growingPath.d}
            pathLength={1}
            fill="none"
            stroke="#1F5B46"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}
      </svg>

      <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:h-[460px] sm:gap-8 xl:gap-16">
        <div className="flex flex-col items-start gap-5 sm:gap-9">
          {left.map(({ module, index }) => (
            <DiagramNode
              key={module.label}
              module={module}
              side="left"
              done={inView && index < seq.done}
              drawing={inView && seq.active === index}
              nodeRef={(node) => {
                nodeRefs.current[index] = node;
              }}
            />
          ))}
        </div>

        <div ref={hubRef} className="relative flex items-center justify-center">
          {/* The arriving module's line, opened above the mark. */}
          <div
            className="al-eco-hub pointer-events-none absolute bottom-[calc(100%+16px)] left-1/2 hidden w-[280px] -translate-x-1/2 text-center sm:block"
            data-show={hubModule ? "true" : "false"}
            aria-hidden="true"
          >
            <p className="text-[17px] font-bold text-[#1F5B46]">{hubModule?.label ?? ""}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-[#7A736B]">{hubModule?.description ?? ""}</p>
          </div>

          <span
            aria-hidden="true"
            className="pointer-events-none absolute -z-10 h-[240px] w-[240px] rounded-full bg-[radial-gradient(circle,rgba(31,91,70,0.14),transparent_68%)] blur-lg"
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

        <div className="flex flex-col items-end gap-5 sm:gap-9">
          {right.map(({ module, index }) => (
            <DiagramNode
              key={module.label}
              module={module}
              side="right"
              done={inView && index < seq.done}
              drawing={inView && seq.active === index}
              nodeRef={(node) => {
                nodeRefs.current[index] = node;
              }}
            />
          ))}
        </div>
      </div>

      {/* Phones have no room for the popup above the mark, so the arriving
          module's line is shown as a caption under the diagram instead. */}
      <div
        className="al-eco-hub-m mx-auto mt-9 min-h-[72px] max-w-[300px] text-center sm:hidden"
        data-show={hubModule ? "true" : "false"}
        aria-hidden="true"
      >
        <p className="text-[15px] font-bold text-[#1F5B46]">{hubModule?.label ?? ""}</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-[#7A736B]">{hubModule?.description ?? ""}</p>
      </div>
    </div>
  );
}

function DiagramNode({
  module,
  side,
  nodeRef,
  done,
  drawing,
}: {
  module: (typeof LANDING_MODULES)[number];
  side: "left" | "right";
  nodeRef: (node: HTMLDivElement | null) => void;
  done: boolean;
  drawing: boolean;
}) {
  const Icon = module.icon;
  return (
    <div
      ref={nodeRef}
      // No card: bare icon + label. The icon sits on the hub-facing side so
      // the beam meets it.
      className={`flex items-center gap-2.5 ${side === "left" ? "flex-row-reverse" : ""}`}
    >
      <Icon
        className={`h-[19px] w-[19px] shrink-0 transition-colors duration-300 sm:h-[22px] sm:w-[22px] ${
          done ? "text-[#1F5B46]" : "text-[#7A736B]"
        }`}
        aria-hidden="true"
      />
      <span
        className={`relative text-left text-[12.5px] font-semibold leading-tight transition-colors duration-300 sm:text-[14px] ${
          done ? "text-[#1F5B46]" : "text-[#2F2A24]"
        }`}
      >
        {module.label}
        {/* Connection cue: a small underline that fills as the beam grows,
            then stays as a solid green rule once connected. */}
        <span
          aria-hidden="true"
          className={`absolute -bottom-[3px] left-0 block h-[2px] rounded-full bg-[#1F5B46] ${
            done ? "w-full" : drawing ? "al-eco-underline" : "w-0"
          }`}
        />
      </span>
    </div>
  );
}
