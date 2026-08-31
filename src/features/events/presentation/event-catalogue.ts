import type { FpCatalogItem, Hackathon } from "@/components/store/types";
import {
  fpItemToHackathon,
  isFpHackathonLike,
  isTechHackathonOrEvent,
  techOpportunityToHackathon,
} from "@/features/events/presentation/event-presentation";
import type { TechOpportunity } from "@/lib/tech-opportunities/tech-opportunity-types";

export function getDisplayHackathons(hackathons: Hackathon[], items: TechOpportunity[], fpItems: FpCatalogItem[] = []) {
  const seen = new Set(hackathons.map(hackathonIdentityKey));
  const fromTech = items
    .filter(isTechHackathonOrEvent)
    .map(techOpportunityToHackathon)
    .filter((hackathon) => addUniqueIdentity(seen, hackathonIdentityKey(hackathon)));
  const fromFp = fpItems
    .filter(isFpHackathonLike)
    .map(fpItemToHackathon)
    .filter((hackathon) => addUniqueIdentity(seen, hackathonIdentityKey(hackathon)));
  return [...fromTech, ...fromFp, ...hackathons].sort(sortHackathonsForDisplay);
}

function hackathonIdentityKey(hackathon: Hackathon) {
  return normalizedIdentity(hackathon.url, hackathon.id_slug, hackathon.name);
}

function normalizedIdentity(...values: Array<string | undefined | null>) {
  const value = [...values].reverse().find((item) => item && String(item).trim());
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(edicion|edition)\s+\d+\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function addUniqueIdentity(seen: Set<string>, identity: string) {
  if (!identity || seen.has(identity)) return false;
  seen.add(identity);
  return true;
}

function sortHackathonsForDisplay(a: Hackathon, b: Hackathon) {
  const priorityDiff = prioritySortValue(a.priority) - prioritySortValue(b.priority);
  if (priorityDiff) return priorityDiff;
  const dawDiff = (b.encaje_daw_1_5 ?? 0) - (a.encaje_daw_1_5 ?? 0);
  if (dawDiff) return dawDiff;
  return String(a.start_at || a.registration_deadline_at || "9999").localeCompare(String(b.start_at || b.registration_deadline_at || "9999"));
}

function prioritySortValue(value?: string) {
  const normalized = String(value || "media").trim().toLowerCase();
  if (normalized.includes("alta")) return 0;
  if (normalized.includes("media")) return 1;
  if (normalized.includes("baja")) return 2;
  return 9;
}
