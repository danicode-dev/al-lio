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
    <div className="flex items-center gap-1">
      <Link href="/calendar" aria-label="Abrir calendario" className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground">
        <CalendarDays className="h-4 w-4" />
      </Link>
      <Link href="/tasks" aria-label={pendingAlerts ? `${pendingAlerts} tareas prioritarias` : "Abrir tareas"} className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground">
        <Bell className="h-4 w-4" />
        {pendingAlerts > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {Math.min(pendingAlerts, 9)}
          </span>
        )}
      </Link>
    </div>
  );
}
