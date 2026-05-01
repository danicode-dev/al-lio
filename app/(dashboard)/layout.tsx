import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { getGlobalStore } from "@/lib/data";
import { StoreProvider } from "@/components/guest-app";
import type { Store } from "@/components/guest-app";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const store = (await getGlobalStore()) as unknown as Store;

  return (
    <StoreProvider initialStore={store}>
      <div className="flex min-h-[100dvh] bg-background">
        <AppSidebar />
        <main className="min-w-0 flex-1 relative pb-20 md:pb-0">
          <div className="flex h-14 items-center justify-between border-b bg-background px-4 md:hidden sticky top-0 z-40">
            <span className="text-lg font-bold tracking-tight">Al-Lio</span>
            <ThemeToggle />
          </div>
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </StoreProvider>
  );
}
