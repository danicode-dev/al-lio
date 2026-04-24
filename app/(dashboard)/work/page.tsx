import { ExternalLink, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TD, TH, TBody, THead, TR, Table } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { createOpportunity, deleteOpportunity, updateOpportunityStatus } from "@/lib/actions";
import { buildJobSearchUrl, initialQuickSearches, jobPlatforms } from "@/lib/deeplinks/job-search-urls";
import { createClient } from "@/lib/supabase/server";

export default async function WorkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("opportunities")
    .select("id,title,company,source,location,status,url,created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });
  const opportunities = data ?? [];

  return (
    <div>
      <PageHeader title="Trabajo" />

      <section className="grid gap-3 lg:grid-cols-5">
        {jobPlatforms.map((platform) => (
          <Card key={platform} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{platform}</p>
                <Badge className="mt-2">{["InfoJobs", "Adzuna", "Jooble", "Remotive"].includes(platform) ? "API preparada" : "Deep link"}</Badge>
              </div>
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>
        ))}
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Busquedas rapidas</h2>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {initialQuickSearches.slice(0, 9).map(([keyword, location]) => (
            <Card key={`${keyword}-${location}`} className="p-3">
              <p className="text-sm font-medium">{keyword}</p>
              <p className="text-xs text-muted-foreground">{location}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["LinkedIn", "InfoJobs", "Indeed"].map((platform) => (
                  <Button key={platform} asChild size="sm" variant="outline">
                    <a href={buildJobSearchUrl(platform, keyword, location)} target="_blank" rel="noreferrer">
                      {platform}
                    </a>
                  </Button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Guardar oferta</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createOpportunity} className="space-y-3">
              <Input name="title" placeholder="Puesto" required />
              <Input name="company" placeholder="Empresa" />
              <Input name="source" placeholder="Fuente" defaultValue="manual" />
              <Input name="location" placeholder="Ubicacion" />
              <Input name="province" placeholder="Provincia" />
              <Input name="url" type="url" placeholder="URL" required />
              <Select name="status" defaultValue="guardada">
                <option value="guardada">guardada</option>
                <option value="pendiente_revision">pendiente_revision</option>
                <option value="aplicada">aplicada</option>
                <option value="entrevista">entrevista</option>
                <option value="rechazada">rechazada</option>
                <option value="descartada">descartada</option>
              </Select>
              <label className="flex items-center gap-2 text-sm"><input name="remote" type="checkbox" /> Remoto</label>
              <Textarea name="notes" placeholder="Notas" />
              <Button>Guardar</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <Table>
            <THead>
              <TR><TH>Oferta</TH><TH>Estado</TH><TH>Acciones</TH></TR>
            </THead>
            <TBody>
              {opportunities.map((item) => (
                <TR key={item.id}>
                  <TD>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.company ?? item.source} · {item.location ?? "Sin ubicacion"}</p>
                  </TD>
                  <TD><Badge>{item.status}</Badge></TD>
                  <TD>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild><a href={item.url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a></Button>
                      <form action={updateOpportunityStatus}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="status" value="aplicada" /><Button size="sm" variant="outline">Aplicada</Button></form>
                      <form action={deleteOpportunity}><input type="hidden" name="id" value={item.id} /><Button size="sm" variant="ghost">Eliminar</Button></form>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
