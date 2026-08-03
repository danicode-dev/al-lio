import { BookOpen, Briefcase, Calendar, CheckSquare, Trophy } from "lucide-react";
import Image from "next/image";

const modules = [
  { label: "Tareas", Icon: CheckSquare },
  { label: "Trabajo", Icon: Briefcase },
  { label: "Cursos", Icon: BookOpen },
  { label: "Hackathons", Icon: Trophy },
  { label: "Calendario", Icon: Calendar },
] as const;

const highlights = [
  "Prioridades semanales",
  "Calendario conectado",
  "Oportunidades guardadas",
] as const;

export function LoginBrandPanel() {
  return (
    <>
      <style>{`
        .brand-panel {
          position: relative;
          display: flex;
          min-height: 100svh;
          overflow: hidden;
          background: #080d10;
          color: #f0ede8;
        }

        .brand-kinetic {
          position: absolute;
          inset: 0;
          z-index: 0;
          object-fit: cover;
          opacity: 0.4;
          mix-blend-mode: screen;
          pointer-events: none;
        }

        .brand-shade {
          position: absolute;
          inset: 0;
          z-index: 1;
          background:
            radial-gradient(ellipse 62% 52% at 50% 48%, rgba(8,13,16,0.72) 0%, transparent 70%),
            radial-gradient(ellipse 70% 55% at 55% 28%, rgba(49,95,79,0.1) 0%, transparent 60%),
            linear-gradient(170deg, rgba(8,13,16,0.76) 0%, rgba(8,13,16,0.2) 55%, rgba(8,13,16,0.86) 100%);
          pointer-events: none;
        }

        .brand-content {
          position: relative;
          z-index: 2;
          display: flex;
          width: 100%;
          flex-direction: column;
          justify-content: space-between;
          padding: 52px;
        }

        .brand-logo {
          width: 300px;
          height: auto;
        }

        .brand-title {
          max-width: 560px;
          margin: 32px 0 0;
          font-family: var(--font-barlow), sans-serif;
          font-size: 44px;
          font-weight: 900;
          line-height: 1.08;
          letter-spacing: 0;
        }

        .brand-title span {
          color: #e85b2a;
        }

        .brand-copy {
          max-width: 480px;
          margin: 18px 0 0;
          color: #a7b0b2;
          font-size: 15px;
          line-height: 1.8;
        }

        .brand-highlights {
          display: grid;
          max-width: 520px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 34px 0 0;
        }

        .brand-highlight {
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
          padding: 12px;
          color: #d8d0c7;
          font-size: 12px;
          line-height: 1.45;
        }

        .brand-modules {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          border-top: 1px solid rgba(255,255,255,0.1);
          padding-top: 18px;
        }

        .brand-module {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #aab2b4;
          font-size: 13px;
          white-space: nowrap;
        }

        @media (max-width: 1100px) {
          .brand-content {
            padding: 40px;
          }

          .brand-title {
            font-size: 36px;
          }

          .brand-highlights {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 900px) {
          .brand-panel {
            display: none;
          }
        }
      `}</style>

      <aside className="brand-panel" aria-label="Presentacion de AL-LIO">
        <Image
          className="brand-kinetic"
          src="/assets/al_lio_kinetic_background_dark.png"
          alt=""
          aria-hidden="true"
          fill
          sizes="55vw"
          priority
        />
        <div className="brand-shade" aria-hidden="true" />

        <div className="brand-content">
          <div>
            <Image
              className="brand-logo"
              src="/assets/al_lio_logo_slogan_transparente_1060x360.png"
              alt="AL-LIO - Menos planes. Mas accion."
              width={1060}
              height={360}
              priority
            />

            <p className="brand-title">
              Enfoca. Actua.
              <br />
              <span>Logra mas.</span>
            </p>
            <p className="brand-copy">
              Un panel privado para decidir la semana, ordenar oportunidades y avanzar con evidencia.
            </p>

            <div className="brand-highlights" aria-label="Resumen del panel">
              {highlights.map((highlight) => (
                <span key={highlight} className="brand-highlight">
                  {highlight}
                </span>
              ))}
            </div>
          </div>

          <nav className="brand-modules" aria-label="Modulos principales">
            {modules.map(({ label, Icon }) => (
              <span key={label} className="brand-module">
                <Icon aria-hidden="true" size={15} />
                {label}
              </span>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
