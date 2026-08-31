import {
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckSquare,
  GraduationCap,
  Newspaper,
  SlidersHorizontal,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type ModuleKey =
  | "tareas"
  | "calendario"
  | "cursos"
  | "bloc"
  | "eventos"
  | "trabajo"
  | "noticias"
  | "competencias";

export type LandingModule = {
  key: ModuleKey;
  icon: LucideIcon;
  side: "left" | "right";
  href: string;
};

// The eight areas of the app. Labels and descriptions live in i18n.ts,
// keyed by `key`; here we only keep the structure the diagram needs.
export const LANDING_MODULES: readonly LandingModule[] = [
  { key: "tareas", side: "left", href: "/tasks", icon: CheckSquare },
  { key: "calendario", side: "left", href: "/calendar", icon: CalendarDays },
  { key: "cursos", side: "left", href: "/courses", icon: GraduationCap },
  { key: "bloc", side: "left", href: "/bloc", icon: BookOpen },
  { key: "eventos", side: "right", href: "/hackathons", icon: Trophy },
  { key: "trabajo", side: "right", href: "/work", icon: Briefcase },
  { key: "noticias", side: "right", href: "/noticias", icon: Newspaper },
  { key: "competencias", side: "right", href: "/roadmap", icon: SlidersHorizontal },
] as const;
