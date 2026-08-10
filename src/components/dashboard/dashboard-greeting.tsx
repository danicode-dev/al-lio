import type { ReactNode } from "react";

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

export function DashboardGreeting({ userName, actions }: { userName?: string; actions: ReactNode }) {
  const name = userName?.trim() || "";

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-[#e15d2d]">Inicio</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] text-[#111111] dark:text-[#faf9f6] sm:text-3xl">
          {greetingForNow()}{name ? `, ${name}` : ""} <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-1 text-sm text-[#6b6f72] dark:text-[#c9c4bc]">Aquí tienes lo importante para avanzar hoy.</p>
      </div>
      <div className="hidden items-center gap-2 md:flex">{actions}</div>
    </header>
  );
}
