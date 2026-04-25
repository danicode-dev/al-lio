import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { getGlobalStore } from "@/lib/data";
import { StoreProvider } from "@/components/guest-app";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const store = (await getGlobalStore()) as any;

  return (
    <StoreProvider initialStore={store}>
      <div className="flex min-h-[100dvh] bg-background">
        <AppSidebar />
        <main className="min-w-0 flex-1 relative pb-20 md:pb-0">
          <div className="flex h-14 items-center justify-between border-b bg-background/80 backdrop-blur-md px-4 md:hidden sticky top-0 z-40">
            <div className="flex items-center gap-2"><img src="/al-lio-logo.png" alt="Al-Lio" className="h-6 w-auto" /><span className="font-semibold tracking-tight text-lg">Al-Lio</span></div>
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
