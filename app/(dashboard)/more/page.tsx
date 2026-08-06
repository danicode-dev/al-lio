import Link from "next/link";
import {
  Home,
  ListTodo,
  BookOpen,
  Newspaper,
  Briefcase,
  GraduationCap,
  FolderKanban,
  CalendarDays,
  Link as LinkIcon,
  Route,
  Settings,
  Compass,
  UserCircle,
} from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

const SECTIONS = [
  {
    href: "/dashboard",
    label: "Inicio",
    Icon: Home,
    cardBg: "bg-blue-50 dark:bg-blue-950/40",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    iconColor: "text-blue-500",
  },
  {
    href: "/roadmap",
    label: "Roadmap",
    Icon: Route,
    cardBg: "bg-cyan-50 dark:bg-cyan-950/40",
    iconBg: "bg-cyan-100 dark:bg-cyan-900/50",
    iconColor: "text-cyan-500",
  },
  {
    href: "/tasks",
    label: "Tareas",
    Icon: ListTodo,
    cardBg: "bg-indigo-50 dark:bg-indigo-950/40",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/50",
    iconColor: "text-indigo-500",
  },
  {
    href: "/bloc",
    label: "Bloc",
    Icon: BookOpen,
    cardBg: "bg-violet-50 dark:bg-violet-950/40",
    iconBg: "bg-violet-100 dark:bg-violet-900/50",
    iconColor: "text-violet-500",
  },
  {
    href: "/noticias",
    label: "Noticias",
    Icon: Newspaper,
    cardBg: "bg-emerald-50 dark:bg-emerald-950/40",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    iconColor: "text-emerald-500",
  },
  {
    href: "/work",
    label: "Trabajo",
    Icon: Briefcase,
    cardBg: "bg-orange-50 dark:bg-orange-950/40",
    iconBg: "bg-orange-100 dark:bg-orange-900/50",
    iconColor: "text-orange-500",
  },
  {
    href: "/courses",
    label: "Cursos",
    Icon: GraduationCap,
    cardBg: "bg-sky-50 dark:bg-sky-950/40",
    iconBg: "bg-sky-100 dark:bg-sky-900/50",
    iconColor: "text-sky-500",
  },
  {
    href: "/hackathons",
    label: "Hackathons",
    Icon: FolderKanban,
    cardBg: "bg-rose-50 dark:bg-rose-950/40",
    iconBg: "bg-rose-100 dark:bg-rose-900/50",
    iconColor: "text-rose-500",
  },
  {
    href: "/calendar",
    label: "Calendario",
    Icon: CalendarDays,
    cardBg: "bg-amber-50 dark:bg-amber-950/40",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    iconColor: "text-amber-500",
  },
  {
    href: "/links",
    label: "Enlaces",
    Icon: LinkIcon,
    cardBg: "bg-teal-50 dark:bg-teal-950/40",
    iconBg: "bg-teal-100 dark:bg-teal-900/50",
    iconColor: "text-teal-500",
  },
  {
    href: "/settings",
    label: "Ajustes",
    Icon: Settings,
    cardBg: "bg-slate-100 dark:bg-slate-900/60",
    iconBg: "bg-slate-200 dark:bg-slate-800/60",
    iconColor: "text-slate-500",
  },
  {
    href: "/profile",
    label: "Perfil",
    Icon: UserCircle,
    cardBg: "bg-orange-50 dark:bg-orange-950/40",
    iconBg: "bg-orange-100 dark:bg-orange-900/50",
    iconColor: "text-orange-500",
  },
] as const;

export default function MorePage() {
  return (
    <div className="px-4 py-6 pb-8 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight">
            Explora todas{" "}
            <span className="text-primary">las secciones</span>
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Accede a cualquier parte de Al-Lio
          </p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <Compass className="h-6 w-6 text-primary" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {SECTIONS.map(({ href, label, Icon, cardBg, iconBg, iconColor }) => (
          <Link
            key={href}
            href={href}
            className={`group flex flex-col items-start gap-3 rounded-2xl p-4 transition-all duration-200 active:scale-95 hover:shadow-md ${cardBg}`}
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${iconBg}`}>
              <Icon className={`h-5 w-5 ${iconColor}`} strokeWidth={1.8} />
            </div>
            <span className="text-sm font-semibold leading-tight text-foreground">
              {label}
            </span>
          </Link>
        ))}
        <LogoutButton />
      </div>
    </div>
  );
}
