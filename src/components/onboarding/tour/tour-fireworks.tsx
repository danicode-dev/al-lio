// Three bursts of sparks behind the closing card. Pure CSS, drawn on a layer
// that ignores the pointer, and skipped entirely under reduced motion - a
// celebration should never be the thing that makes the app unusable.
export function TourFireworks({ muted }: { muted: boolean }) {
  if (muted) return null;

  const bursts = [
    { left: "18%", top: "22%", delay: 0, hue: "#E15D2D", size: 16 },
    { left: "80%", top: "18%", delay: 0.35, hue: "#e8b04b", size: 14 },
    { left: "50%", top: "12%", delay: 0.7, hue: "#1f7a4d", size: 15 },
    { left: "26%", top: "74%", delay: 1.05, hue: "#e8b04b", size: 14 },
    { left: "76%", top: "70%", delay: 1.4, hue: "#E15D2D", size: 16 },
  ];
  const sparks = 18;

  return (
    <div className="al-tour-fireworks" aria-hidden="true">
      <style>{`
        .al-tour-fireworks { position: fixed; inset: 0; pointer-events: none; overflow: hidden; }
        .al-tour-burst { position: absolute; width: 0; height: 0; }
        .al-tour-flash {
          position: absolute;
          width: 26px; height: 26px; margin: -13px 0 0 -13px;
          border-radius: 999px;
          opacity: 0;
          animation: al-tour-flash 2200ms ease-out infinite;
        }
        .al-tour-spark {
          position: absolute;
          border-radius: 999px;
          opacity: 0;
          animation: al-tour-spark 2200ms cubic-bezier(0.1, 0.75, 0.25, 1) infinite;
        }
        @keyframes al-tour-flash {
          0%   { transform: scale(0.2); opacity: 0; }
          6%   { transform: scale(1.6); opacity: .95; }
          22%  { transform: scale(2.4); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes al-tour-spark {
          0%   { transform: translate3d(0, 0, 0) scale(1); opacity: 0; }
          6%   { opacity: 1; }
          55%  { opacity: 1; }
          100% { transform: translate3d(var(--dx), var(--dy), 0) scale(0.5); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) { .al-tour-fireworks { display: none; } }
      `}</style>
      {bursts.map((burst) => (
        <div key={burst.left} className="al-tour-burst" style={{ left: burst.left, top: burst.top }}>
          <span
            className="al-tour-flash"
            style={{
              background: `radial-gradient(circle, ${burst.hue} 0%, transparent 70%)`,
              animationDelay: `${burst.delay}s`,
            }}
          />
          {Array.from({ length: sparks }, (_, index) => {
            const angle = (index / sparks) * Math.PI * 2;
            const distance = 150 + (index % 3) * 55;
            const size = burst.size - (index % 3) * 3;
            return (
              <span
                key={index}
                className="al-tour-spark"
                style={{
                  width: size,
                  height: size,
                  margin: `${-size / 2}px 0 0 ${-size / 2}px`,
                  background: burst.hue,
                  boxShadow: `0 0 14px 3px ${burst.hue}`,
                  animationDelay: `${burst.delay + (index % 3) * 0.04}s`,
                  ["--dx" as string]: `${Math.cos(angle) * distance}px`,
                  ["--dy" as string]: `${Math.sin(angle) * distance}px`,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
