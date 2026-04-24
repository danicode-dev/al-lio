import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createHackathon, createReminderFromHackathon, createTaskFromHackathon, markHackathonReviewed } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

const provinces = ["Granada", "Malaga", "Almeria", "Jaen", "Cordoba", "Online"];
const statuses = ["inscripcion_abierta", "pendiente", "realizado", "revisar_futura_edicion", "descartado"];

export default async function HackathonsPage({ searchParams }: { searchParams: Promise<{ province?: string; status?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let query = supabase.from("hackathons").select("*").eq("user_id", user!.id).order("priority", { ascending: true });
  if (params.province) query = query.eq("province", params.province);
  if (params.status) query = query.eq("status", params.status);
  const { data } = await query;
  const hackathons = data ?? [];

  return (
    <div>
      <PageHeader title="Hackathons" />
      <form className="mb-5 grid gap-3 sm:grid-cols-3">
        <Select name="province" defaultValue={params.province ?? ""}>
          <option value="">Todas las provincias</option>
          {provinces.map((province) => <option key={province}>{province}</option>)}
        </Select>
        <Select name="status" defaultValue={params.status ?? ""}>
          <option value="">Todos los estados</option>
          {statuses.map((status) => <option key={status}>{status}</option>)}
        </Select>
        <Button variant="outline">Filtrar</Button>
      </form>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader><CardTitle>Nuevo hackathon</CardTitle></CardHeader>
          <CardContent>
            <form action={createHackathon} className="space-y-3">
              <Input name="name" placeholder="Nombre" required />
              <Input name="organizer" placeholder="Organizador" />
              <Select name="province" defaultValue="Granada">{provinces.map((p) => <option key={p}>{p}</option>)}</Select>
              <Input name="city" placeholder="Ciudad" />
              <Input name="type" placeholder="Tipo" defaultValue="hackathon" />
              <Select name="status" defaultValue="revisar_futura_edicion">{statuses.map((s) => <option key={s}>{s}</option>)}</Select>
              <Select name="priority" defaultValue="media"><option>alta</option><option>media</option><option>baja</option></Select>
              <Input name="url" type="url" placeholder="URL" />
              <Input name="next_review_at" type="date" />
              <Textarea name="notes" placeholder="Notas" />
              <Button>Crear</Button>
            </form>
          </CardContent>
        </Card>
        <div className="grid gap-3 xl:grid-cols-2">
          {hackathons.map((hackathon) => (
            <Card key={hackathon.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{hackathon.name}</p>
                  <p className="text-sm text-muted-foreground">{hackathon.organizer ?? "Sin organizador"} · {hackathon.province}{hackathon.city ? `/${hackathon.city}` : ""}</p>
                </div>
                <Badge>{hackathon.status}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">Revision: {hackathon.last_reviewed_at ?? "-"} · Proxima: {hackathon.next_review_at ?? "-"}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {hackathon.url && <Button asChild size="sm" variant="outline"><a href={hackathon.url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" />Abrir web</a></Button>}
                <form action={createTaskFromHackathon}>
                  <input type="hidden" name="id" value={hackathon.id} />
                  <input type="hidden" name="name" value={hackathon.name} />
                  <input type="hidden" name="priority" value={hackathon.priority ?? "media"} />
                  <input type="hidden" name="next_review_at" value={hackathon.next_review_at ?? ""} />
                  <Button size="sm" variant="outline">Crear tarea</Button>
                </form>
                <form action={createReminderFromHackathon}>
                  <input type="hidden" name="id" value={hackathon.id} />
                  <input type="hidden" name="name" value={hackathon.name} />
                  <input type="hidden" name="next_review_at" value={hackathon.next_review_at ?? ""} />
                  <Button size="sm" variant="outline">Crear recordatorio</Button>
                </form>
                <form action={markHackathonReviewed}><input type="hidden" name="id" value={hackathon.id} /><Button size="sm" variant="ghost">Marcar revisado</Button></form>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
