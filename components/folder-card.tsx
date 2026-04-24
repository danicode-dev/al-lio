import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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
    <Link href={href}>
      <Card className="folder-tab min-h-36 border-0 bg-[#e4c15f] p-5 text-stone-950 shadow-sm transition-transform hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-4 pt-5">
          <Icon className="h-7 w-7" />
          <Badge className="border-stone-900/20 bg-stone-950/10 text-stone-950">{count}</Badge>
        </div>
        <div className="mt-6">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-stone-800">{description}</p>
        </div>
      </Card>
    </Link>
  );
}
