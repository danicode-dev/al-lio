import { AppSidebar } from "@/components/app-sidebar";
import { getGlobalStore } from "@/lib/data";
import { StoreProvider } from "@/components/guest-store";
import { DailyAlerts } from "@/components/daily-alerts";
import { MobileHeaderNavigation } from "@/components/mobile-header-navigation";
import type { Store } from "@/components/store/types";
import { cookies } from "next/headers";
import { Toaster } from "sonner";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [globalStore, cookieStore] = await Promise.all([
    getGlobalStore(),
    cookies(),
  ]);
  const store = globalStore as unknown as Store;
  const sidebarPreference = cookieStore.get("al-lio-sidebar-collapsed");

  return (
    <StoreProvider initialStore={store}>
      <div className="flex min-h-[100dvh] bg-background">
        <AppSidebar
          userName={store.userName}
          defaultCollapsed={sidebarPreference?.value === "true"}
          hasPersistedPreference={Boolean(sidebarPreference)}
        />
        <main className="relative min-w-0 flex-1">
          <MobileHeaderNavigation />
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
            {children}
          </div>
        </main>
        <DailyAlerts />
      </div>
      <Toaster position="bottom-right" richColors duration={3500} closeButton />
    </StoreProvider>
  );
}
