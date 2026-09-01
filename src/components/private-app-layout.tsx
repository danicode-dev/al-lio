import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { DailyAlerts } from "@/components/daily-alerts";
import { MobileHeaderNavigation } from "@/components/mobile-header-navigation";
import { ProductTourShell } from "@/components/onboarding/tour/tour-provider";
import type { Store } from "@/components/store/types";
import { getAuthenticatedStudentContext } from "@/lib/auth/authenticated-student-context";
import { getProductTourState } from "@/lib/db/repositories/product_tour";
import { shouldOfferProductTour } from "@/lib/onboarding/tour-state";
import { ApplicationStoreProvider } from "@/shared/store/application-store";

type PrivateAppLayoutProps = {
  children: ReactNode;
  loadStore: () => Promise<unknown>;
};

export async function PrivateAppLayout({ children, loadStore }: PrivateAppLayoutProps) {
  const [loadedStore, cookieStore, { session, profile }] = await Promise.all([
    loadStore(),
    cookies(),
    getAuthenticatedStudentContext(),
  ]);
  const store = loadedStore as Store;
  const sidebarPreference = cookieStore.get("al-lio-sidebar-collapsed");

  // Both private route groups share this gate and shell. Their store loaders
  // differ, but authentication, onboarding, navigation and the product tour
  // must never drift between page-scoped and global-store routes.
  if (!profile.cycle_code) {
    redirect("/onboarding");
  }

  const tourState = await getProductTourState(session.uid);

  return (
    <ApplicationStoreProvider initialStore={store}>
      <div className="flex min-h-[100dvh] bg-background">
        <AppSidebar
          userName={store.userName}
          userEmail={store.userEmail}
          defaultCollapsed={sidebarPreference?.value === "true"}
          hasPersistedPreference={Boolean(sidebarPreference)}
        />
        <main className="relative min-w-0 flex-1">
          <MobileHeaderNavigation />
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">{children}</div>
        </main>
        <DailyAlerts />
        {shouldOfferProductTour(tourState) && <ProductTourShell initialState={tourState} />}
      </div>
      <Toaster position="bottom-right" richColors duration={3500} closeButton />
    </ApplicationStoreProvider>
  );
}
