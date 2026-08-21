import { DashboardClient } from "@/components/dashboard/dashboard-client";
import type { Store } from "@/components/guest-app";
import { getDashboardStore } from "@/lib/data";

export default async function DashboardPage() {
  const store = (await getDashboardStore()) as unknown as Store;
  return <DashboardClient initialStore={store} />;
}
