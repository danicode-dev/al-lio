import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { MoreVertical } from "lucide-react";

export function FolderCard({
  href,
  title,
  description,
  count,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  count: string;
  icon: LucideIcon;
}) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm hover:bg-accent/50 p-3 shadow-sm transition-colors group">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
          <Icon className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="truncate text-sm font-medium text-foreground">{title}</span>
          <span className="truncate text-[11px] text-muted-foreground">{description} • {count}</span>
        </div>
      </div>
      <MoreVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
