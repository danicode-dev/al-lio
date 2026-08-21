import type { ReactNode } from "react";
import { dashboardLightSurface } from "@/components/dashboard/dashboard-surface";

export function DashboardCalendar({ children, loadFailed = false }: { children: ReactNode; loadFailed?: boolean }) {
  return (
    <section style={dashboardLightSurface} className="rounded-[20px] border border-[#ece7dc] bg-white p-3 text-[#111111] shadow-[0_10px_26px_rgba(17,17,17,0.045)]">
      {loadFailed && <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">El calendario puede estar incompleto. Reintenta la carga.</p>}
      {children}
    </section>
  );
}
