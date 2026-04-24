import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="min-w-0 flex-1">
        <div className="flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
          <span className="font-semibold">TechLife</span>
          <form action={signOut}>
            <Button variant="outline" size="sm">Salir</Button>
          </form>
        </div>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
          <div className="mb-6 hidden justify-end md:flex">
            <form action={signOut}>
              <Button variant="outline" size="sm">Salir</Button>
            </form>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
