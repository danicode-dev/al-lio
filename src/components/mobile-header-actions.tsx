"use client";

import Link from "next/link";
import { Bell, CalendarDays } from "lucide-react";

import { useStore } from "@/components/guest-store";

export function MobileHeaderActions() {
  const { store } = useStore();
  const pendingAlerts = store.tasks.filter((task) =>
    task.status !== "completada"
    && task.status !== "cancelada"
    && (task.priority === "alta" || task.priority === "critica" || task.category === "urgente"),
  ).length;

  return (
    <div className="flex items-center gap-1.5">
      <Link href="/calendar" aria-label="Abrir calendario" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#ece7dc] bg-white text-[#5f6368] shadow-[0_2px_8px_rgba(17,17,17,0.04)] transition hover:border-[#f4b398] hover:bg-[#fff7f3] hover:text-[#e15d2d]">
        <CalendarDays className="h-4 w-4" />
      </Link>
      <Link href="/tasks" aria-label={pendingAlerts ? `${pendingAlerts} tareas prioritarias` : "Abrir tareas"} className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#ece7dc] bg-white text-[#5f6368] shadow-[0_2px_8px_rgba(17,17,17,0.04)] transition hover:border-[#f4b398] hover:bg-[#fff7f3] hover:text-[#e15d2d]">
        <Bell className="h-4 w-4" />
        {pendingAlerts > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f06a37] px-1 text-[9px] font-bold text-white ring-2 ring-white">
            {Math.min(pendingAlerts, 9)}
          </span>
        )}
      </Link>
    </div>
  );
}
