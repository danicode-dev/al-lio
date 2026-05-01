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
  { href: "/links", label: "Más", icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border/40 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300",
                isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground active:scale-95"
              )}
            >
              <div className={cn(
                "relative flex items-center justify-center p-1 rounded-full transition-all duration-300",
                isActive && "bg-primary/10 shadow-[0_0_15px_rgba(var(--primary),0.3)]"
              )}>
                <Icon className={cn("w-5 h-5", isActive && "fill-primary/20")} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-all duration-300",
                isActive ? "opacity-100" : "opacity-70"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
