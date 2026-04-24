import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { seedHackathons } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <div>
      <PageHeader title="Configuracion" />
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">Cuenta</p>
        <p className="mt-1 font-medium">{user?.email}</p>
      </Card>
      <Card className="mt-4 p-5">
        <p className="font-medium">Datos iniciales</p>
        <p className="mt-1 text-sm text-muted-foreground">Carga hackathons base por provincia.</p>
        <form action={seedHackathons} className="mt-4">
          <Button variant="outline">Cargar hackathons</Button>
        </form>
      </Card>
    </div>
  );
}
