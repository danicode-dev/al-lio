"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  FolderKanban,
  GraduationCap,
  Home,
  LinkIcon,
  ListTodo,
  Newspaper,
  Settings,
  LogOut,
  UserCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { signOut } from "@/lib/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SIDEBAR_KEY = "al-lio.sidebar.collapsed.v1";

const items = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/tasks", label: "Tareas", icon: ListTodo },
  { href: "/bloc", label: "Bloc", icon: BookOpen },
  { href: "/noticias", label: "Noticias", icon: Newspaper },
  { href: "/work", label: "Trabajo", icon: Briefcase },
  { href: "/courses", label: "Cursos", icon: GraduationCap },
  { href: "/hackathons", label: "Hackathons", icon: FolderKanban },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/links", label: "Enlaces", icon: LinkIcon },
  { href: "/settings", label: "Ajustes", icon: Settings },
  { href: "/profile", label: "Perfil", icon: UserCircle },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "true");
  }, []);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  }

  return (
    <aside className={cn("sticky top-0 hidden h-screen shrink-0 border-r bg-card md:block", collapsed ? "w-16" : "w-60")}>
      <div className="flex h-14 items-center px-2">
        {collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-muted"
            aria-label="Expandir menú"
            title="Expandir menú"
          >
            <Image
              src="/assets/al_lio_symbol_transparent.png"
              alt="AL-LIO"
              width={26}
              height={26}
              className="block dark:hidden"
              priority
            />
            <Image
              src="/assets/al_lio_favicon_dark_circle_512.png"
              alt="AL-LIO"
              width={26}
              height={26}
              className="hidden rounded-sm dark:block"
              priority
            />
          </button>
        ) : (
          <>
            <div className="min-w-0 flex-1 pl-1">
              <Image
                src="/assets/al_lio_logo_horizontal_transparent.png"
                alt="AL-LIO"
                width={615}
                height={214}
                className="block object-contain object-left dark:hidden"
                style={{ width: 128, height: "auto" }}
                priority
              />
              <Image
                src="/assets/al_lio_logo_horizontal_white_transparent.png"
                alt="AL-LIO"
                width={560}
                height={115}
                className="hidden object-contain object-left dark:block"
                style={{ width: 128, height: "auto" }}
                priority
              />
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={toggleCollapsed} aria-label="Plegar menú">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
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
