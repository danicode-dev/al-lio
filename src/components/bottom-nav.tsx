"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListTodo, BookOpen, Newspaper, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/tasks", label: "Tareas", icon: ListTodo },
  { href: "/bloc", label: "Bloc", icon: BookOpen },
  { href: "/noticias", label: "Noticias", icon: Newspaper },
  { href: "/more", label: "Más", icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50">
      <div className="bg-background/92 backdrop-blur-2xl border-t border-border/40 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] pb-safe">
        <div className="flex items-center h-16 px-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 select-none",
                  "transition-all duration-200 active:scale-90",
                  isActive ? "text-[#E15D2D]" : "text-muted-foreground",
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-11 h-7 rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-[#FBE7DD] scale-110"
                      : "scale-100",
                  )}
                >
                  <Icon
                    className="w-[18px] h-[18px]"
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                </div>
                <span
                  className={cn(
                    "text-[9.5px] font-semibold leading-none tracking-wide transition-opacity duration-200",
                    isActive ? "opacity-100" : "opacity-40",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
