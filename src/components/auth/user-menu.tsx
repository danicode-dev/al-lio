"use client";

import Link from "next/link";
import { ChevronDown, ChevronsUpDown, LogOut, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { signOut } from "@/features/auth/server/sign-out";
import { cn } from "@/lib/utils";

// One account control for both shells. It never signs the student out on a
// single press: the trigger opens a small menu and "Cerrar sesión" is a
// deliberate second action, next to "Ver perfil". The desktop variant is a
// popover anchored to the sidebar footer; the mobile variant expands in
// place at the end of the navigation sheet, matching that sheet's styling.

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part.charAt(0).toLocaleUpperCase("es-ES")).join("") || "AL";
}

function AccountLinks({ id, onNavigate, className }: { id?: string; onNavigate?: () => void; className?: string }) {
  return (
    <div id={id} className={cn("space-y-0.5", className)} role="menu">
      <Link
        href="/profile"
        role="menuitem"
        onClick={onNavigate}
        className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold text-[#303238] outline-none transition-colors duration-200 hover:bg-[#f8f4ee] active:bg-[#f2ede5] focus-visible:ring-2 focus-visible:ring-[#e15d2d]/35 motion-reduce:transition-none"
      >
        <UserRound className="h-[18px] w-[18px] shrink-0 text-[#6f6a60]" strokeWidth={1.8} aria-hidden="true" />
        Ver perfil
      </Link>
      <form action={signOut} className="contents">
        <button
          type="submit"
          role="menuitem"
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-semibold text-[#b23b32] outline-none transition-colors duration-200 hover:bg-[#fbeeed] active:bg-[#f7e2e0] focus-visible:ring-2 focus-visible:ring-[#e15d2d]/35 motion-reduce:transition-none"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0 text-[#c0392b]" strokeWidth={1.8} aria-hidden="true" />
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}

export function SidebarAccountMenu({
  name,
  email,
  collapsed = false,
}: {
  name: string;
  email?: string;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const initials = initialsOf(name);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {open && (
        <div
          id={menuId}
          className={cn(
            "absolute z-50 rounded-2xl border border-[#e8e1d2] bg-white p-1.5 shadow-[0_-12px_34px_rgba(60,40,15,0.16)]",
            collapsed ? "bottom-0 left-[calc(100%+12px)] w-52" : "bottom-[calc(100%+8px)] left-0 right-0",
          )}
        >
          <AccountLinks onNavigate={() => setOpen(false)} />
        </div>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={collapsed ? `Cuenta de ${name}` : undefined}
        className={cn(
          "group relative flex items-center rounded-2xl text-left outline-none transition-[background-color,box-shadow] duration-200 hover:bg-[#f8f5ef] active:bg-[#f2eee7] focus-visible:ring-2 focus-visible:ring-[#e15d2d]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffefa] motion-reduce:transition-none",
          collapsed ? "mx-auto h-12 w-12 justify-center" : "min-h-[62px] w-full gap-3 px-2.5 py-2",
          open && "bg-[#fdf0ea]",
        )}
      >
        <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#efc3b1] bg-[#fbe7dd] text-xs font-black tracking-[0.04em] text-[#b94720] shadow-[0_3px_10px_rgba(17,17,17,0.04)]">
          {initials}
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#fffefa] bg-[#2c8b63]" aria-hidden="true" />
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-extrabold text-[#25282d]">{name}</span>
              {email && <span className="mt-0.5 block truncate text-xs font-medium text-[#777b82]">{email}</span>}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-[#9a958a]" aria-hidden="true" />
          </>
        )}
      </button>
    </div>
  );
}

export function MobileAccountMenu({
  name,
  email,
  onNavigate,
}: {
  name: string;
  email?: string;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const initials = initialsOf(name);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={cn(
          "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left outline-none transition-colors duration-200 hover:bg-[#f8f4ee] active:bg-[#f2ede5] focus-visible:ring-2 focus-visible:ring-[#e15d2d]/35 motion-reduce:transition-none",
          open && "bg-[#fdf0ea]",
        )}
      >
        <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#efc3b1] bg-[#fbe7dd] text-[11px] font-black tracking-[0.04em] text-[#b94720]">
          {initials}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#fffefa] bg-[#2c8b63]" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-[#27292d]">{name}</span>
          {email && <span className="block truncate text-xs font-medium text-[#777b82]">{email}</span>}
        </span>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-[#777b82] transition-transform duration-200", open && "rotate-180")}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </button>

      {open && <AccountLinks id={menuId} onNavigate={onNavigate} className="mt-1 pl-1" />}
    </div>
  );
}
