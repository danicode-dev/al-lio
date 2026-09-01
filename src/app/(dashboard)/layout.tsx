import { getGlobalStore } from "@/lib/data";
import { PrivateAppLayout } from "@/components/private-app-layout";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <PrivateAppLayout loadStore={getGlobalStore}>{children}</PrivateAppLayout>;
}
