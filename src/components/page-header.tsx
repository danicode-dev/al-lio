import { cn } from "@/lib/utils";

// Shared header for every authenticated first-level route: an orange
// eyebrow, a black h1, and an optional subtitle, with an optional
// right-aligned actions slot (typically StudentHeaderActions plus a
// page-specific button). Column on mobile/tablet, row from md up so the
// actions align with the heading's baseline instead of floating in a
// separate padded row above the content - see issue #129.
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("al-page-header flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        <p className="al-page-header-eyebrow">{eyebrow}</p>
        <h1 className="al-page-header-title">{title}</h1>
        {subtitle ? <p className="al-page-header-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
