"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial state
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (saved === "dark" || (!saved && prefersDark)) {
      setIsDark(true);
      applyTheme(true);
    } else {
      setIsDark(false);
      applyTheme(false);
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      applyTheme(false);
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      applyTheme(true);
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Cambiar tema">
      {isDark ? <Sun className="h-[1.2rem] w-[1.2rem] text-yellow-500" /> : <Moon className="h-[1.2rem] w-[1.2rem]" />}
    </Button>
  );
}
