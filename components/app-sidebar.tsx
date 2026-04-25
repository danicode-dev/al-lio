"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  GraduationCap,
  Home,
  LinkIcon,
  ListTodo,
  Settings,
  Waypoints,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { signOut } from "@/lib/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/work", label: "Trabajo", icon: Briefcase },
  { href: "/courses", label: "Cursos", icon: GraduationCap },
  { href: "/hackathons", label: "Hackathons", icon: FolderKanban },
  { href: "/tasks", label: "Tareas", icon: ListTodo },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn("sticky top-0 hidden h-screen shrink-0 border-r bg-card md:block", collapsed ? "w-16" : "w-60")}>
      <div className="flex h-14 items-center justify-between px-3">
        {!collapsed && <span className="text-base font-bold tracking-tight">Al-Lio</span>}
        <div className="flex items-center gap-1">
          {!collapsed && <ThemeToggle />}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed((value) => !value)} aria-label="Plegar menu">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <nav className="space-y-1 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                active && "bg-muted text-foreground",
                collapsed && "justify-center px-0",
              )}
              title={item.label}
            >
              <Icon className="h-4 w-4" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="absolute bottom-4 left-0 w-full px-2">
        <form action={signOut}>
          <button
            type="submit"
            className={cn(
              "flex w-full h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
              collapsed && "justify-center px-0",
            )}
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
