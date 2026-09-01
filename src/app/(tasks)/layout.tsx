import type { ReactNode } from "react";

import { PrivateAppLayout } from "@/components/private-app-layout";
import { getTasksPageStore } from "@/features/tasks/server/page-store";

export const dynamic = "force-dynamic";

export default function TasksLayout({ children }: { children: ReactNode }) {
  return <PrivateAppLayout loadStore={getTasksPageStore}>{children}</PrivateAppLayout>;
}
