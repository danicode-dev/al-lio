"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flag,
  GraduationCap,
  Home,
  ListChecks,
  Newspaper,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SIDEBAR_KEY = "al-lio.sidebar.collapsed.v1";
const SIDEBAR_COOKIE = "al-lio-sidebar-collapsed";

const NAV_GROUPS = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard", label: "Inicio", icon: Home },
      { href: "/roadmap", label: "Competencias", icon: SlidersHorizontal },
      { href: "/tasks", label: "Tareas", icon: ListChecks },
      { href: "/bloc", label: "Bloc", icon: BookOpen },
    ],
  },
  {
    label: "Comunicación",
    items: [
      { href: "/noticias", label: "Noticias", icon: Newspaper },
      { href: "/work", label: "Trabajo", icon: Briefcase },
    ],
  },
  {
    label: "Aprendizaje",
    items: [
      { href: "/courses", label: "Cursos", icon: GraduationCap },
      { href: "/hackathons", label: "Eventos y retos", icon: Flag },
      { href: "/calendar", label: "Calendario", icon: CalendarDays },
    ],
  },
] as const;

type AppSidebarProps = {
  userName?: string;
  defaultCollapsed?: boolean;
  hasPersistedPreference?: boolean;
};

export function AppSidebar({ userName, defaultCollapsed = false, hasPersistedPreference = false }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const displayName = userName?.trim() || "Estudiante";
  const initials = getInitials(displayName);

  useEffect(() => {
    if (hasPersistedPreference) return;

    try {
      const storedPreference = localStorage.getItem(SIDEBAR_KEY);
      if (storedPreference === null) return;

      const nextCollapsed = storedPreference === "true";
      setCollapsed(nextCollapsed);
      persistSidebarPreference(nextCollapsed);
    } catch {
      // Storage can be unavailable in hardened browser contexts. The
      // server-provided default remains a safe, fully usable fallback.
    }
  }, [hasPersistedPreference]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const nextCollapsed = !current;
      persistSidebarPreference(nextCollapsed);
      return nextCollapsed;
    });
  }

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "sticky top-0 z-40 hidden h-screen shrink-0 flex-col border-r border-[#e9e3d8] bg-[#fffefa] text-[#22211f] shadow-[4px_0_24px_rgba(17,17,17,0.035)] transition-[width] duration-200 ease-out motion-reduce:transition-none md:flex",
        collapsed ? "w-[76px]" : "w-[272px]",
      )}
    >
      <div className={cn("flex h-[88px] shrink-0 items-center justify-between", collapsed ? "gap-0.5 px-1" : "gap-3 px-5")}>
        <Image
          src={collapsed ? "/assets/al_lio_symbol.png" : "/assets/al_lio_logo_horizontal.png"}
          alt="AL-LÍO"
          width={collapsed ? 1254 : 2172}
          height={collapsed ? 1254 : 724}
          className={cn("block shrink-0 object-contain", collapsed ? "h-8 w-8" : "h-auto w-[154px] object-left")}
          priority
        />
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir navegación" : "Contraer navegación"}
          aria-expanded={!collapsed}
          className={cn(
            "grid shrink-0 place-items-center rounded-xl border border-[#e6e0d6] bg-white text-[#565b63] shadow-[0_3px_10px_rgba(17,17,17,0.035)] outline-none transition-[background-color,border-color,color,box-shadow] duration-200 hover:border-[#d9d1c5] hover:bg-[#f8f5ef] hover:text-[#202328] active:bg-[#f2eee7] focus-visible:ring-2 focus-visible:ring-[#e15d2d]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffefa] motion-reduce:transition-none",
            collapsed ? "h-[30px] w-[30px]" : "h-9 w-9",
          )}
        >
          {collapsed ? <ChevronRight className="h-[18px] w-[18px]" aria-hidden="true" /> : <ChevronLeft className="h-[18px] w-[18px]" aria-hidden="true" />}
        </button>
      </div>

      <nav aria-label="Navegación principal" className={cn("scrollbar-none min-h-0 flex-1 px-3", collapsed ? "overflow-visible" : "overflow-y-auto")}>
        {NAV_GROUPS.map((group, groupIndex) => (
          <section key={group.label} className={cn("py-3", groupIndex > 0 && "border-t border-[#ece6dc]")}>
            {!collapsed && <h2 className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#777b82]">{group.label}</h2>}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isSidebarRouteActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    // Stable hook for the product tour's spotlight. Derived
                    // from the route so adding a nav entry needs no extra
                    // bookkeeping here.
                    data-tour={`nav-${item.href.replace(/^\//, "")}`}
                    aria-current={active ? "page" : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    className={cn(
                      "group relative flex h-10 items-center rounded-xl text-sm font-semibold outline-none transition-[background-color,color,box-shadow] duration-200 before:absolute before:left-0 before:top-2 before:h-6 before:w-[3px] before:rounded-r-full before:bg-transparent before:transition-colors before:duration-200 hover:bg-[#f8f5ef] hover:text-[#202328] active:bg-[#f2eee7] focus-visible:ring-2 focus-visible:ring-[#e15d2d]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffefa] motion-reduce:transition-none",
                      collapsed ? "mx-auto w-12 justify-center px-0" : "w-full gap-3 px-3",
                      active && "bg-[#fdf0ea] text-[#d65327] shadow-[0_4px_14px_rgba(17,17,17,0.035)] before:bg-[#e15d2d] hover:bg-[#fbe9e1] hover:text-[#c94f21] hover:shadow-[0_5px_15px_rgba(17,17,17,0.045)] active:bg-[#f8ded2]",
                    )}
                  >
                    <Icon className="h-[19px] w-[19px] shrink-0" strokeWidth={active ? 2.1 : 1.8} aria-hidden="true" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {collapsed && <SidebarTooltip label={item.label} />}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="mt-auto shrink-0 border-t border-[#e9e3d8] p-3">
        <Link
          href="/profile"
          aria-current={isSidebarRouteActive(pathname, "/profile") ? "page" : undefined}
          aria-label={collapsed ? `Ver perfil de ${displayName}` : undefined}
          className={cn(
            "group relative flex items-center rounded-2xl outline-none transition-[background-color,color,box-shadow] duration-200 before:absolute before:left-0 before:top-1/2 before:h-7 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-transparent hover:bg-[#f8f5ef] active:bg-[#f2eee7] focus-visible:ring-2 focus-visible:ring-[#e15d2d]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffefa] motion-reduce:transition-none",
            collapsed ? "mx-auto h-12 w-12 justify-center" : "min-h-[62px] gap-3 px-2.5 py-2",
            isSidebarRouteActive(pathname, "/profile") && "bg-[#fdf0ea] before:bg-[#e15d2d]",
          )}
        >
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#efc3b1] bg-[#fbe7dd] text-xs font-black tracking-[0.04em] text-[#b94720] shadow-[0_3px_10px_rgba(17,17,17,0.04)]">
            {initials}
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#fffefa] bg-[#2c8b63]" aria-hidden="true" />
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-extrabold text-[#25282d]">{displayName}</span>
              <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-[#777b82]">
                Ver perfil <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </span>
          )}
          {collapsed && <SidebarTooltip label="Perfil" />}
        </Link>
      </div>
    </aside>
  );
}

function SidebarTooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none invisible absolute left-[calc(100%+12px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-lg border border-[#e9e3d8] bg-[#242321] px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-[0_8px_22px_rgba(17,17,17,0.14)] transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100 motion-reduce:transition-none"
    >
      {label}
    </span>
  );
}

function isSidebarRouteActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("es-ES"))
    .join("");

  return initials || "AL";
}

function persistSidebarPreference(collapsed: boolean) {
  try {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  } catch {
    // The cookie still preserves the preference when local storage is blocked.
  }

  document.cookie = `${SIDEBAR_COOKIE}=${String(collapsed)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
