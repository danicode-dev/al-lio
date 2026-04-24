import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createQuickLink, deleteQuickLink } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

export default async function LinksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from("quick_links").select("*").eq("user_id", user!.id).order("is_favorite", { ascending: false });
  const links = data ?? [];

  return (
    <div>
      <PageHeader title="Enlaces rapidos" />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader><CardTitle>Nuevo enlace</CardTitle></CardHeader>
          <CardContent>
            <form action={createQuickLink} className="space-y-3">
              <Input name="name" placeholder="Nombre" required />
              <Input name="url" type="url" placeholder="URL" required />
              <Input name="category" placeholder="Categoria" />
              <Textarea name="description" placeholder="Descripcion" />
              <label className="flex items-center gap-2 text-sm"><input name="is_favorite" type="checkbox" /> Favorito</label>
              <Button>Guardar</Button>
            </form>
          </CardContent>
        </Card>
        <div className="grid gap-3 xl:grid-cols-3">
          {links.map((link) => (
            <Card key={link.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-medium">{link.name}</p><p className="text-sm text-muted-foreground">{link.category ?? "general"}</p></div>
                {link.is_favorite && <Badge>favorito</Badge>}
              </div>
              <div className="mt-4 flex gap-2">
                <Button asChild size="sm" variant="outline"><a href={link.url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" />Abrir</a></Button>
                <form action={deleteQuickLink}><input type="hidden" name="id" value={link.id} /><Button size="sm" variant="ghost">Eliminar</Button></form>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
