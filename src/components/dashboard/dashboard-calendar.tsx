import type { ReactNode } from "react";
import { dashboardLightSurface } from "@/components/dashboard/dashboard-surface";

export function DashboardCalendar({ children }: { children: ReactNode }) {
  return <section style={dashboardLightSurface} className="rounded-[20px] border border-[#ece7dc] bg-white p-3 text-[#111111] shadow-[0_10px_26px_rgba(17,17,17,0.045)]">{children}</section>;
}
