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
  Route,
  Settings,
  Compass,
  UserCircle,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { isCurrentUserAdmin } from "@/lib/auth/authorization";

const SECTIONS = [
  {
    href: "/dashboard",
    label: "Inicio",
    Icon: Home,
    cardBg: "bg-teal-50",
    iconBg: "bg-teal-100",
    iconColor: "text-teal-500",
  },
  {
    href: "/roadmap",
    label: "Competencias",
    Icon: Route,
    cardBg: "bg-cyan-50",
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-500",
  },
  {
    href: "/tasks",
    label: "Tareas",
    Icon: ListTodo,
    cardBg: "bg-indigo-50",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-500",
  },
  {
    href: "/bloc",
    label: "Bloc",
    Icon: BookOpen,
    cardBg: "bg-violet-50",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-500",
  },
  {
    href: "/noticias",
    label: "Noticias",
    Icon: Newspaper,
    cardBg: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-500",
  },
  {
    href: "/work",
    label: "Trabajo",
    Icon: Briefcase,
    cardBg: "bg-orange-50",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-500",
  },
  {
    href: "/courses",
    label: "Cursos",
    Icon: GraduationCap,
    cardBg: "bg-fuchsia-50",
    iconBg: "bg-fuchsia-100",
    iconColor: "text-fuchsia-500",
  },
  {
    href: "/hackathons",
    label: "Eventos y retos",
    Icon: FolderKanban,
    cardBg: "bg-rose-50",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-500",
  },
  {
    href: "/calendar",
    label: "Calendario",
    Icon: CalendarDays,
    cardBg: "bg-amber-50",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-500",
  },
  {
    href: "/profile",
    label: "Perfil",
    Icon: UserCircle,
    cardBg: "bg-orange-50",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-500",
  },
] as const;

export default async function MorePage() {
  const isAdmin = await isCurrentUserAdmin();
  const sections = isAdmin
    ? [...SECTIONS, { href: "/settings", label: "Administración", Icon: Settings, cardBg: "bg-slate-100", iconBg: "bg-slate-200", iconColor: "text-slate-500" }]
    : SECTIONS;

  return (
    <div className="px-4 py-6 pb-8 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight">
            Explora todas{" "}
            <span className="text-[#E15D2D]">las secciones</span>
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Accede a cualquier parte de Al-Lio
          </p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FBE7DD]">
          <Compass className="h-6 w-6 text-[#E15D2D]" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {sections.map(({ href, label, Icon, cardBg, iconBg, iconColor }) => (
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
