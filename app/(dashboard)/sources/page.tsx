import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const sources = [
  ["LinkedIn", "deeplink", "active"],
  ["InfoJobs", "api + deeplink", "planned"],
  ["Indeed", "deeplink", "active"],
  ["Tecnoempleo", "rss + deeplink", "planned"],
  ["Adzuna", "api", "planned"],
  ["Jooble", "api", "planned"],
  ["Remotive", "api", "active"],
  ["JobToday", "deeplink", "active"],
  ["Talent.com", "deeplink", "active"],
  ["Welcome to the Jungle", "deeplink", "active"],
];

export default function SourcesPage() {
  return (
    <div>
      <PageHeader title="Fuentes" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sources.map(([name, type, status]) => (
          <Card key={name} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{name}</p>
              <Badge>{status}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{type}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
