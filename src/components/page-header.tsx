import { cn } from "@/lib/utils";

// Shared header for every authenticated first-level route: an orange
// eyebrow, a black h1, and an optional subtitle, with an optional
// right-aligned actions slot (typically StudentHeaderActions plus a
// page-specific button). Column on mobile/tablet, row from md up.
//
// The actions slot aligns to items-start (the top of the text block, i.e.
// the eyebrow line), not items-end/items-center. The eyebrow's font-size/
// line-height is identical on every page, so this is the one anchor whose
// position never moves - items-end previously tied the actions' vertical
// position to the *bottom* of the text block, which shifts per page
// depending on subtitle length/wrapping, so the same actions cluster
// landed at a different height on every route. shrink-0 keeps the actions
// cluster from ever being compressed by a long title/subtitle next to it.
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
    <header className={cn("al-page-header flex flex-col gap-4 md:flex-row md:items-start md:justify-between", className)}>
      <div className="min-w-0">
        <p className="al-page-header-eyebrow">{eyebrow}</p>
        <h1 className="al-page-header-title">{title}</h1>
        {subtitle ? <p className="al-page-header-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
