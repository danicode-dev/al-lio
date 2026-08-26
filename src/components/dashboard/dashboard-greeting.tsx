import { PageHeader } from "@/components/page-header";
import { StudentHeaderActions } from "@/components/student-header-actions";

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

export function DashboardGreeting({ userName }: { userName?: string }) {
  const name = userName?.trim() || "";

  return (
    <PageHeader
      eyebrow="Inicio"
      title={
        <>
          {greetingForNow()}{name ? `, ${name}` : ""} <span aria-hidden="true">👋</span>
        </>
      }
      subtitle="Aquí tienes lo importante para avanzar hoy."
      actions={
        <div className="hidden md:flex md:items-center md:gap-2">
          <StudentHeaderActions />
        </div>
      }
    />
  );
}
