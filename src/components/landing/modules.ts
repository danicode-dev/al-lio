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

export type LandingModule = {
  label: string;
  description: string;
  icon: LucideIcon;
  side: "left" | "right";
  href: string;
};

// The eight areas exactly as the authenticated app names them. The landing
// diagram and its mobile fallback both read this list, so a rename happens
// in one place.
export const LANDING_MODULES: readonly LandingModule[] = [
  { label: "Tareas", side: "left", href: "/tasks", icon: CheckSquare, description: "Organiza entregas y pendientes en un tablero. Nada se te pasa." },
  { label: "Calendario", side: "left", href: "/calendar", icon: CalendarDays, description: "Clases, entregas y eventos en una vista. Se sincroniza con Google Calendar." },
  { label: "Cursos", side: "left", href: "/courses", icon: GraduationCap, description: "La formación de tu ciclo con tu progreso y lo que viene después." },
  { label: "Bloc", side: "left", href: "/bloc", icon: BookOpen, description: "Notas y apuntes rápidos, siempre contigo. Exportables a PDF." },
  { label: "Eventos y retos", side: "right", href: "/hackathons", icon: Trophy, description: "Hackathons, charlas y convocatorias de tu sector, con fecha e inscripción." },
  { label: "Trabajo", side: "right", href: "/work", icon: Briefcase, description: "Prácticas y ofertas filtradas por tu familia profesional. Sigue tus candidaturas." },
  { label: "Noticias", side: "right", href: "/noticias", icon: Newspaper, description: "Actualidad de tu ciclo, verificada antes de llegar a tu panel." },
  { label: "Competencias", side: "right", href: "/roadmap", icon: SlidersHorizontal, description: "Qué dominas y qué te falta, con recursos para cerrar cada hueco." },
] as const;
