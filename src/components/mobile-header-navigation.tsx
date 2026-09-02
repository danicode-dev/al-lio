"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, type LucideIcon } from "lucide-react";
import { forwardRef, useEffect, useId, useRef, useState, type ReactNode } from "react";

import { MobileAccountMenu } from "@/components/auth/user-menu";
import { NAV_GROUPS, isNavRouteActive } from "@/components/nav-destinations";
import { StudentHeaderActions } from "@/components/student-header-actions";
import { useApplicationStore } from "@/shared/store/application-store";
import { cn } from "@/lib/utils";

// The sheet renders the shared NAV_GROUPS model in the same order the sidebar
// uses, so the app is never organised one way on a phone and another way on a
// desktop. Group 0 ("Principal") takes the left column; the rest stack on the
// right. Each group is one contiguous block the product tour can spotlight.
const [MAIN_GROUP, ...SIDE_GROUPS] = NAV_GROUPS;

const menuTriggerClass =
  "inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#e8e2d8] bg-white text-[#45494f] shadow-[0_2px_8px_rgba(17,17,17,0.04)] outline-none transition-[border-color,background-color,color,transform] duration-200 hover:border-[#f4b398] hover:bg-[#fff7f3] hover:text-[#d65327] active:scale-95 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none";

export function MobileHeaderNavigation() {
  const pathname = usePathname();
  const { store } = useApplicationStore();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const menuRootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => firstLinkRef.current?.focus());

    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      // The product tour holds this sheet open on purpose while it explains
      // what is inside, and its card sits outside the menu. Treating a press
      // on that card as "clicked away" closed the sheet underneath the very
      // step describing it, and left the student pressing Siguiente twice.
      if (target?.closest?.(".al-tour-layer")) return;
      if (menuRootRef.current && !menuRootRef.current.contains(target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-[#ebe5dc] bg-[#fffefa]/95 backdrop-blur-xl md:hidden">
      <div className="relative z-20 flex h-14 items-center justify-between gap-3 px-4">
        <Image
          src="/assets/al_lio_logo_horizontal.png"
          alt="AL-LÍO"
          width={2172}
          height={724}
          className="block h-8 w-auto shrink-0 object-contain object-left"
          priority
        />

        <div className="flex shrink-0 items-center">
          <div ref={menuRootRef} className="mr-2.5">
            <button
              ref={triggerRef}
              type="button"
              // On a phone the destinations live behind this button, so the
              // tour points here instead of opening the sheet.
              data-tour="mobile-menu-trigger"
              onClick={() => setOpen((current) => !current)}
              aria-label={open ? "Cerrar navegación" : "Abrir navegación"}
              aria-expanded={open}
              aria-controls={menuId}
              className={cn(menuTriggerClass, open && "border-[#efb49c] bg-[#fdf0ea] text-[#d65327]")}
            >
              {open ? <X className="h-[18px] w-[18px]" aria-hidden="true" /> : <Menu className="h-[18px] w-[18px]" aria-hidden="true" />}
            </button>

            {open && (
              <>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Cerrar navegación"
                  onClick={() => setOpen(false)}
                  className="fixed inset-x-0 bottom-0 top-14 z-0 cursor-default bg-[#28231f]/15 backdrop-blur-[3px]"
                />
                <nav
                  id={menuId}
                  // The product tour opens this sheet and spotlights it whole,
                  // so a student on a phone sees the destinations instead of
                  // just the button that hides them.
                  data-tour="mobile-menu-panel"
                  aria-label="Navegación móvil"
                  className="fixed inset-x-0 top-14 z-10 max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain rounded-b-[24px] border-b border-[#e9e3d8] bg-[#fffefa] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5 shadow-[0_20px_45px_rgba(35,29,24,0.16)]"
                >
                  {/* Principal on the left, the rest stacked on the right: one
                      contiguous block per group, so each is a shape the tour
                      can highlight on its own, exactly like the sidebar. */}
                  <div className="grid grid-cols-2 gap-x-3">
                    <MobileMenuGroup
                      label={MAIN_GROUP.label}
                      tourId={MAIN_GROUP.mobileTourId}
                      className="border-r border-[#e9e3d8] pr-3"
                    >
                      {MAIN_GROUP.items.map((item, index) => (
                        <MobileMenuLink
                          key={item.href}
                          ref={index === 0 ? firstLinkRef : undefined}
                          {...item}
                          active={isNavRouteActive(pathname, item.href)}
                          onNavigate={() => setOpen(false)}
                        />
                      ))}
                    </MobileMenuGroup>

                    <div className="space-y-3">
                      {SIDE_GROUPS.map((group) => (
                        <MobileMenuGroup key={group.label} label={group.label} tourId={group.mobileTourId}>
                          {group.items.map((item) => (
                            <MobileMenuLink
                              key={item.href}
                              {...item}
                              active={isNavRouteActive(pathname, item.href)}
                              onNavigate={() => setOpen(false)}
                            />
                          ))}
                        </MobileMenuGroup>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 border-t border-[#e9e3d8] pt-3">
                    <MobileAccountMenu
                      name={store.userName?.trim() || "Estudiante"}
                      email={store.userEmail}
                      onNavigate={() => setOpen(false)}
                    />
                  </div>
                </nav>
              </>
            )}
          </div>

          <StudentHeaderActions size="touch" />
        </div>
      </div>
    </header>
  );
}

function MobileMenuGroup({ label, className, tourId, children }: { label: string; className?: string; tourId?: string; children: ReactNode }) {
  return (
    <section aria-label={label} data-tour={tourId} className={className}>
      <h2 className="mb-2 min-h-7 px-2 text-[9px] font-extrabold uppercase leading-3 tracking-[0.08em] text-[#666a71]">{label}</h2>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

type MobileMenuLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate: () => void;
};

const MobileMenuLink = forwardRef<HTMLAnchorElement, MobileMenuLinkProps>(function MobileMenuLink(
  { href, label, icon: Icon, active, onNavigate },
  ref,
) {
  return (
    <Link
      ref={ref}
      href={href}
      // Same stable hook the sidebar exposes, so a tour step can point at the
      // same destination on either viewport.
      data-tour={`nav-${href.replace(/^\//, "")}`}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-12 items-center gap-2.5 rounded-xl px-2 text-[13px] font-semibold leading-tight text-[#303238] outline-none transition-[background-color,color] duration-200 hover:bg-[#f8f4ee] active:bg-[#f2ede5] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
        active && "bg-[#fdf0ea] text-[#d65327] hover:bg-[#fbe8df]",
      )}
    >
      <Icon className="h-[19px] w-[19px] shrink-0" strokeWidth={active ? 2.1 : 1.8} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
});
