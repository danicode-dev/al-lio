import { AppSidebar } from "@/components/app-sidebar";
import { getGlobalStore } from "@/lib/data";
import { StoreProvider } from "@/components/guest-store";
import { DailyAlerts } from "@/components/daily-alerts";
import { MobileHeaderNavigation } from "@/components/mobile-header-navigation";
import { ProductTourShell } from "@/components/onboarding/tour/tour-provider";
import { getValidatedSession } from "@/lib/auth/session";
import { getProductTourState } from "@/lib/db/repositories/product_tour";
import { shouldOfferProductTour, type ProductTourState } from "@/lib/onboarding/tour-state";
import type { Store } from "@/components/store/types";
import { cookies } from "next/headers";
import { Toaster } from "sonner";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [globalStore, cookieStore, session] = await Promise.all([
    getGlobalStore(),
    cookies(),
    getValidatedSession(),
  ]);
  const store = globalStore as unknown as Store;
  const sidebarPreference = cookieStore.get("al-lio-sidebar-collapsed");

  // Resolved on the server so a student who has already finished or dismissed
  // the tour never downloads its state, and the overlay cannot flash before a
  // client-side check settles.
  let tourState: ProductTourState | null = null;
  if (session) {
    const state = await getProductTourState(session.uid);
    if (shouldOfferProductTour(state)) tourState = state;
  }

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
        {/* Rendered only for a student who is actually being offered the tour,
            so nobody else's dashboard even requests its chunk. It wraps
            nothing: the overlay is portalled to the body, which is what keeps
            the tour incapable of disturbing this layout. */}
        {tourState && <ProductTourShell initialState={tourState} />}
      </div>
      <Toaster position="bottom-right" richColors duration={3500} closeButton />
    </StoreProvider>
  );
}
