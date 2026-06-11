"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions";

export function LogoutButton() {
  return (
    <form action={signOut} className="contents">
      <button
        type="submit"
        className="group flex flex-col items-start gap-3 rounded-2xl p-4 transition-all duration-200 active:scale-95 hover:shadow-md bg-red-50 dark:bg-red-950/40 w-full"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 bg-red-100 dark:bg-red-900/50">
          <LogOut className="h-5 w-5 text-red-500" strokeWidth={1.8} />
        </div>
        <span className="text-sm font-semibold leading-tight text-foreground">
          Cerrar sesión
        </span>
      </button>
    </form>
  );
}
