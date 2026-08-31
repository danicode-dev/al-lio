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
};

// The eight areas of the app. Labels and descriptions live in i18n.ts,
// keyed by `key`; here we only keep the structure the diagram needs.
export const LANDING_MODULES: readonly LandingModule[] = [
  { key: "tareas", side: "left", icon: CheckSquare },
  { key: "calendario", side: "left", icon: CalendarDays },
  { key: "cursos", side: "left", icon: GraduationCap },
  { key: "bloc", side: "left", icon: BookOpen },
  { key: "eventos", side: "right", icon: Trophy },
  { key: "trabajo", side: "right", icon: Briefcase },
  { key: "noticias", side: "right", icon: Newspaper },
  { key: "competencias", side: "right", icon: SlidersHorizontal },
] as const;
