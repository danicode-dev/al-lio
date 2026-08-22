"use client";

import { BookOpen, Briefcase, Calendar, CheckSquare, Trophy } from "lucide-react";
import Image from "next/image";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  avatarSrc: string;
};

// TODO: Replace with approved real testimonials before public presentation.
const TESTIMONIALS: Testimonial[] = [
  {
    quote: "Coordinar campañas, deadlines y oportunidades desde un único panel ha cambiado cómo organizo mi semana. Nada se escapa.",
    name: "Eric García Ortega",
    role: "Técnico de Marketing",
    avatarSrc: "https://randomuser.me/api/portraits/men/76.jpg",
  },
  {
    quote: "Preparo candidaturas y hackathons sin dispersarme. Tener cursos, oportunidades y calendario en un mismo sitio es clave.",
    name: "Yeray Valenzuela Ortega",
    role: "Desarrollador Full Stack",
    avatarSrc: "https://randomuser.me/api/portraits/men/52.jpg",
  },
  {
    quote: "Organizar mi formación continua y mis metas personales es mucho más sencillo. Entro, veo qué toca y lo ejecuto.",
    name: "Lourdes Abril",
    role: "Higienista Bucodental",
    avatarSrc: "https://randomuser.me/api/portraits/women/44.jpg",
  },
];

const MODULES = [
  { label: "Tareas",     Icon: CheckSquare },
  { label: "Trabajo",    Icon: Briefcase   },
  { label: "Cursos",     Icon: BookOpen    },
  { label: "Hackathons", Icon: Trophy      },
  { label: "Calendario", Icon: Calendar    },
] as const;

export function LoginBrandPanel() {
  return (
    <>
      <style>{`
        .brand-panel {
          position: relative;
          overflow: hidden;
          background: #080d10;
          display: flex;
          flex-direction: column;
          min-height: 100svh;
        }

        .brand-kinetic {
          position: absolute;
          inset: 0;
          object-fit: cover;
          opacity: 0.38;
          mix-blend-mode: screen;
          z-index: 0;
          pointer-events: none;
        }

        .brand-overlay {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 62% 52% at 50% 48%, rgba(8,13,16,0.72) 0%, transparent 70%),
            radial-gradient(ellipse 70% 55% at 55% 28%, rgba(49,95,79,0.10) 0%, transparent 60%),
            linear-gradient(170deg, rgba(8,13,16,0.74) 0%, rgba(8,13,16,0.18) 55%, rgba(8,13,16,0.84) 100%);
          z-index: 1;
          pointer-events: none;
        }

        .brand-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          flex: 1;
          justify-content: space-between;
          padding: clamp(28px, 4.5vw, 56px);
          min-height: 0;
        }

        /* ── Top: logo + titular compacto ── */
        .brand-top {
          display: flex;
          flex-direction: column;
          gap: clamp(14px, 2vh, 24px);
          flex-shrink: 0;
        }

        .brand-logo-wrap { flex-shrink: 0; }

        .brand-main {
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        .brand-h1 {
          font-size: clamp(1.75rem, 3vw, 2.8rem);
          font-family: var(--font-barlow, sans-serif);
          font-weight: 800;
          color: #f0ede8;
          line-height: 1.12;
          letter-spacing: -0.02em;
          margin: 0 0 12px 0;
        }

        .brand-accent { color: #e85b2a; }

        .brand-desc {
          font-size: clamp(13px, 1vw, 14px);
          color: #8a9294;
          line-height: 1.7;
          max-width: 44ch;
          margin: 0;
        }

        /* ── Testimonials ── */
        .brand-testimonials {
          display: flex;
          gap: 9px;
          flex-shrink: 0;
        }

        .brand-testimonial {
          flex: 1;
          background: rgba(255,255,255,0.032);
          border: 1px solid rgba(255,255,255,0.072);
          border-radius: 10px;
          padding: 13px 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
        }

        /* Avatar circular + nombre/rol */
        .brand-testimonial-header {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-shrink: 0;
        }

        .brand-testimonial-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
          border: 1.5px solid rgba(255,255,255,0.18);
          display: block;
          filter: brightness(0.82) saturate(0.75);
        }

        .brand-testimonial-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          overflow: hidden;
        }

        .brand-testimonial-name {
          display: block;
          font-size: 10.5px;
          font-weight: 700;
          color: #ede9e4;
          letter-spacing: 0.02em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .brand-testimonial-role {
          display: block;
          font-size: 9.5px;
          color: #6a7375;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .brand-testimonial-text {
          font-size: 11px;
          color: #b4bcc0;
          line-height: 1.65;
          margin: 0;
          flex: 1;
          font-style: italic;
        }

        /* Tablet: show at most two testimonials. */
        @media (max-width: 1100px) and (min-width: 901px) {
          .brand-testimonial:nth-child(3) { display: none; }
        }

        /* Product areas in an edge-to-edge editorial row. */
        .brand-modules {
          display: flex;
          flex-wrap: nowrap;
          justify-content: space-between;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.09);
          flex-shrink: 0;
        }

        .brand-module-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 13.5px;
          font-weight: 500;
          color: #9ea5a8;
          letter-spacing: 0.01em;
          white-space: nowrap;
        }

        @media (prefers-reduced-motion: reduce) {
          .brand-kinetic { display: none; }
        }

        @media (max-width: 900px) {
          .brand-panel { display: none; }
        }
      `}</style>

      <aside className="brand-panel" aria-label="Presentación de AL LÍO">
        <Image
          className="brand-kinetic"
          src="/assets/al_lio_kinetic_background_dark.png"
          alt=""
          aria-hidden={true}
          fill
          sizes="55vw"
          style={{ objectFit: "cover" }}
          priority
        />
        <div className="brand-overlay" aria-hidden="true" />

        <div className="brand-content">

          {/* ── Top: logo + titular ── */}
          <div className="brand-top">
            <div className="brand-logo-wrap">
              <Image
                src="/assets/al_lio_logo_slogan_transparente_1060x360.png"
                alt="AL LÍO — Menos planes. Más acción."
                width={1060}
                height={360}
                style={{ width: "clamp(220px, 26vw, 300px)", height: "auto" }}
                priority
              />
            </div>

            <div className="brand-main">
              <p className="brand-h1">
                Enfoca. Actúa.<br />
                <span className="brand-accent">Logra más.</span>
              </p>
              <p className="brand-desc">
                AL LÍO es tu sistema para organizar el caos,
                enfocarte en lo importante y avanzar
                cada día con intención.
              </p>
            </div>
          </div>

          {/* ── Testimonios ── */}
          <div className="brand-testimonials" role="list">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="brand-testimonial" role="listitem">
                <div className="brand-testimonial-header">
                  <Image
                    className="brand-testimonial-avatar"
                    src={t.avatarSrc}
                    alt={t.name}
                    width={36}
                    height={36}
                  />
                  <div className="brand-testimonial-meta">
                    <span className="brand-testimonial-name">{t.name}</span>
                    <span className="brand-testimonial-role">{t.role}</span>
                  </div>
                </div>
                <p className="brand-testimonial-text">&ldquo;{t.quote}&rdquo;</p>
              </div>
            ))}
          </div>

          {/* ── Módulos ── */}
          <nav className="brand-modules" aria-label="Módulos de AL LÍO">
            {MODULES.map(({ label, Icon }) => (
              <span key={label} className="brand-module-pill">
                <Icon aria-hidden="true" style={{ width: 15, height: 15, flexShrink: 0 }} />
                {label}
              </span>
            ))}
          </nav>

        </div>
      </aside>
    </>
  );
}
