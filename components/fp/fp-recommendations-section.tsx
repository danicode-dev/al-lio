import { getSession } from "@/lib/auth/session";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { getActiveFpCycles, getFpContentForProfile } from "@/lib/db/repositories/fp_catalog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PRIORITY_STYLES: Record<string, string> = {
  Alta: "border-destructive/40 bg-destructive/10 text-destructive",
  Media: "border-primary/30 bg-primary/5 text-primary",
  Baja: "text-muted-foreground",
};

const MAX_ITEMS = 6;

export async function FpRecommendationsSection() {
  const session = await getSession();
  if (!session) return null;

  const profile = await getProfileByUser(session.uid);
  if (!profile || !profile.cycle_group) return null;

  const [items, cycles] = await Promise.all([
    getFpContentForProfile(session.uid, profile),
    getActiveFpCycles(),
  ]);

  if (items.length === 0) return null;

  const cycleLabel = cycles.find((cycle) => cycle.code === profile.cycle_code)?.name ?? profile.cycle_code;

  return (
    <section className="mb-6">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Para tu ciclo</h2>
        <span className="text-sm text-muted-foreground">
          {cycleLabel}
          {profile.academic_year ? ` · ${profile.academic_year}º curso` : ""}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, MAX_ITEMS).map((item) => (
          <Card key={item.id} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <Badge className={PRIORITY_STYLES[item.priority] ?? ""}>{item.priority}</Badge>
                <Badge className="capitalize">{item.type.replace(/_/g, " ")}</Badge>
              </div>
              <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
              {item.entity && <CardDescription>{item.entity}</CardDescription>}
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-3 pt-0">
              {item.description && (
                <p className="line-clamp-3 text-sm text-muted-foreground">{item.description}</p>
              )}
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} className="font-normal">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              {item.source_url && (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Ver más
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
