import type { ReactNode } from "react";

import { PageHeader } from "@/components/page-header";
import { StudentHeaderActions } from "@/components/student-header-actions";
import { cn } from "@/lib/utils";

type FeaturePageProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  catalogue?: boolean;
  compactHeader?: boolean;
};

export function FeaturePage({
  eyebrow,
  title,
  subtitle,
  children,
  catalogue = false,
  compactHeader = false,
}: FeaturePageProps) {
  return (
    <div
      className={cn(
        "pb-6",
        compactHeader ? "space-y-3 md:space-y-6" : "space-y-6",
        catalogue && "al-catalog-hoist",
      )}
    >
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        className={compactHeader ? "al-bloc-page-header" : undefined}
        actions={
          <div className="hidden md:flex md:items-center md:gap-2">
            <StudentHeaderActions />
          </div>
        }
      />
      {children}
    </div>
  );
}
