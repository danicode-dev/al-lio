"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { SidebarAccountMenu } from "@/components/auth/user-menu";
import { NAV_GROUPS, isNavRouteActive } from "@/components/nav-destinations";
import { cn } from "@/lib/utils";

const SIDEBAR_KEY = "al-lio.sidebar.collapsed.v1";
const SIDEBAR_COOKIE = "al-lio-sidebar-collapsed";

type AppSidebarProps = {
  userName?: string;
  userEmail?: string;
  defaultCollapsed?: boolean;
  hasPersistedPreference?: boolean;
};

export function AppSidebar({ userName, userEmail, defaultCollapsed = false, hasPersistedPreference = false }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const displayName = userName?.trim() || "Estudiante";

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
      <div
        className={cn(
          "flex h-[88px] shrink-0 items-center justify-between overflow-hidden transition-[gap,padding] duration-200 ease-out motion-reduce:transition-none",
          collapsed ? "gap-0.5 px-1" : "gap-3 px-5",
        )}
      >
        {/* Both marks are left-anchored in the same box and cross-faded, so the
            header never reflows while the rail width animates. The box width
            tweens in step with the <aside>, clipping the horizontal lockup from
            the right as it collapses instead of hard-swapping it for the
            symbol. The fixed height matches the lockup at w-[154px]
            (2172x724). */}
        <span
          className={cn(
            "relative block h-[52px] shrink-0 overflow-hidden transition-[width] duration-200 ease-out motion-reduce:transition-none",
            collapsed ? "w-8" : "w-[154px]",
          )}
        >
          <Image
            src="/assets/al_lio_logo_horizontal.png"
            alt="AL-LÍO"
            width={2172}
            height={724}
            className={cn(
              "absolute left-0 top-1/2 h-auto w-[154px] max-w-none -translate-y-1/2 object-contain transition-opacity duration-200 ease-out motion-reduce:transition-none",
              collapsed ? "opacity-0" : "opacity-100",
            )}
            priority
          />
          <Image
            src="/assets/al_lio_symbol.png"
            alt=""
            aria-hidden="true"
            width={1254}
            height={1254}
            className={cn(
              "absolute left-0 top-1/2 h-8 w-8 -translate-y-1/2 object-contain transition-opacity duration-200 ease-out motion-reduce:transition-none",
              collapsed ? "opacity-100" : "opacity-0",
            )}
            priority
          />
        </span>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir navegación" : "Contraer navegación"}
          aria-expanded={!collapsed}
          className={cn(
            "grid shrink-0 place-items-center rounded-xl border border-[#e6e0d6] bg-white text-[#565b63] shadow-[0_3px_10px_rgba(17,17,17,0.035)] outline-none transition-[background-color,border-color,color,box-shadow,width,height] duration-200 ease-out hover:border-[#d9d1c5] hover:bg-[#f8f5ef] hover:text-[#202328] active:bg-[#f2eee7] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffefa] motion-reduce:transition-none",
            collapsed ? "h-[30px] w-[30px]" : "h-9 w-9",
          )}
        >
          {collapsed ? <ChevronRight className="h-[18px] w-[18px]" aria-hidden="true" /> : <ChevronLeft className="h-[18px] w-[18px]" aria-hidden="true" />}
        </button>
      </div>

      <nav aria-label="Navegación principal" className={cn("scrollbar-none min-h-0 flex-1 px-3", collapsed ? "overflow-visible" : "overflow-y-auto")}>
        {NAV_GROUPS.map((group, groupIndex) => (
          <section
            key={group.label}
            // The product tour spotlights a whole group - its heading and its
            // destinations - so the anchor lives on the section, not on any
            // one link. `relative` is already what Onborda would set inline,
            // declared here so the tour changes nothing about this layout.
            data-tour={group.tourId}
            className={cn("relative py-3", groupIndex > 0 && "border-t border-[#ece6dc]")}
          >
            {!collapsed && <h2 className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#777b82]">{group.label}</h2>}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isNavRouteActive(pathname, item.href);

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
                      "group relative flex h-10 items-center rounded-xl text-sm font-semibold outline-none transition-[background-color,color,box-shadow] duration-200 before:absolute before:left-0 before:top-2 before:h-6 before:w-[3px] before:rounded-r-full before:bg-transparent before:transition-colors before:duration-200 hover:bg-[#f8f5ef] hover:text-[#202328] active:bg-[#f2eee7] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffefa] motion-reduce:transition-none",
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
        <SidebarAccountMenu name={displayName} email={userEmail} collapsed={collapsed} />
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

function persistSidebarPreference(collapsed: boolean) {
  try {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  } catch {
    // The cookie still preserves the preference when local storage is blocked.
  }

  document.cookie = `${SIDEBAR_COOKIE}=${String(collapsed)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
