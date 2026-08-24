function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

export function DashboardGreeting({ userName }: { userName?: string }) {
  const name = userName?.trim() || "";

  return (
    <header>
      <p className="text-sm font-semibold text-[#e15d2d]">Inicio</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] text-[#111111] sm:text-3xl">
        {greetingForNow()}{name ? `, ${name}` : ""} <span aria-hidden="true">👋</span>
      </h1>
      <p className="mt-1 text-sm text-[#6b6f72]">Aquí tienes lo importante para avanzar hoy.</p>
    </header>
  );
}
