import {
  BookOpen,
  Briefcase,
  CalendarDays,
  Flag,
  GraduationCap,
  Home,
  ListChecks,
  Newspaper,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

export type NavDestination = { href: string; label: string; icon: LucideIcon };
export type NavGroup = {
  label: string;
  /** Product-tour anchor on the desktop sidebar group. */
  tourId: string;
  /** Product-tour anchor on the mobile menu group. */
  mobileTourId: string;
  items: readonly NavDestination[];
};

// The single ordered model of first-level authenticated destinations. The
// desktop sidebar and the mobile menu both render this exact list, in this
// order, with these labels - neither keeps its own copy. Adding or renaming a
// destination happens here once.
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: "Principal",
    tourId: "nav-principal",
    mobileTourId: "mobile-nav-principal",
    items: [
      { href: "/dashboard", label: "Inicio", icon: Home },
      { href: "/roadmap", label: "Competencias", icon: SlidersHorizontal },
      { href: "/tasks", label: "Tareas", icon: ListChecks },
      { href: "/bloc", label: "Bloc", icon: BookOpen },
    ],
  },
  {
    label: "Comunicación",
    tourId: "nav-communication",
    mobileTourId: "mobile-nav-communication",
    items: [
      { href: "/noticias", label: "Noticias", icon: Newspaper },
      { href: "/work", label: "Trabajo", icon: Briefcase },
    ],
  },
  {
    label: "Aprendizaje",
    tourId: "nav-learning",
    mobileTourId: "mobile-nav-learning",
    items: [
      { href: "/courses", label: "Cursos", icon: GraduationCap },
      { href: "/hackathons", label: "Eventos y retos", icon: Flag },
      { href: "/calendar", label: "Calendario", icon: CalendarDays },
    ],
  },
];

/** Flat, ordered list of every first-level destination. */
export const NAV_DESTINATIONS: readonly NavDestination[] = NAV_GROUPS.flatMap(
  (group) => group.items,
);

// Active when the path is the destination root or one of its child routes.
// "/dashboard" only matches exactly - it never claims a nested route - and a
// sibling prefix like "/work" never activates "/workshops".
export function isNavRouteActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

// The header action cluster (Quick Add + Notifications) is shown on every
// first-level destination plus the account area, and nowhere else.
export const NAV_ACTION_ROUTES: readonly string[] = [
  ...NAV_DESTINATIONS.map((destination) => destination.href),
  "/profile",
];
