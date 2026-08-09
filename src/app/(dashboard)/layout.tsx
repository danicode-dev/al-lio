import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { getGlobalStore } from "@/lib/data";
import { StoreProvider, MobileHeaderActions } from "@/components/guest-app";
import { DailyAlerts } from "@/components/daily-alerts";
import type { Store } from "@/components/guest-app";
import Image from "next/image";
import { Toaster } from "sonner";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const store = (await getGlobalStore()) as unknown as Store;

  return (
    <StoreProvider initialStore={store}>
      <div className="flex min-h-[100dvh] bg-background">
        <AppSidebar />
        <main className="min-w-0 flex-1 relative pb-20 md:pb-0">
          <div className="flex h-14 items-center justify-between border-b bg-background/90 backdrop-blur-xl px-4 md:hidden sticky top-0 z-40">
            <div className="relative h-8 w-28">
              <Image
                src="/assets/al_lio_logo_horizontal_transparent.png"
                alt="AL-LIO"
                width={615}
                height={214}
                className="block h-auto w-28 object-contain object-left dark:hidden"
                priority
              />
              <Image
                src="/assets/al_lio_logo_horizontal_white_transparent.png"
                alt="AL-LIO"
                width={560}
                height={115}
                className="hidden h-auto w-28 object-contain object-left dark:block"
                priority
              />
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <MobileHeaderActions />
            </div>
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
