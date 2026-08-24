import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { getGlobalStore } from "@/lib/data";
import { isCurrentUserAdmin } from "@/lib/auth/authorization";
import { StoreProvider } from "@/components/guest-store";
import { MobileHeaderActions } from "@/components/mobile-header-actions";
import { DailyAlerts } from "@/components/daily-alerts";
import type { Store } from "@/components/store/types";
import Image from "next/image";
import { Toaster } from "sonner";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [globalStore, isAdmin] = await Promise.all([
    getGlobalStore(),
    isCurrentUserAdmin(),
  ]);
  const store = globalStore as unknown as Store;

  return (
    <StoreProvider initialStore={store}>
      <div className="flex min-h-[100dvh] bg-background">
        <AppSidebar isAdmin={isAdmin} />
        <main className="min-w-0 flex-1 relative pb-20 md:pb-0">
          <div className="flex h-14 items-center justify-between border-b bg-background/90 backdrop-blur-xl px-4 md:hidden sticky top-0 z-40">
            <div className="relative h-8 w-28">
              <Image
                src="/assets/al_lio_logo_horizontal_transparent.png"
                alt="AL-LIO"
                width={615}
                height={214}
                className="block h-auto w-28 object-contain object-left"
                priority
              />
            </div>
            <MobileHeaderActions />
          </div>
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
            {children}
          </div>
        </main>
        <BottomNav />
        <DailyAlerts />
      </div>
      <Toaster position="bottom-right" richColors duration={3500} closeButton />
    </StoreProvider>
  );
}
