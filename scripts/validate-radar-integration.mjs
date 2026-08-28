/** Statically validates the AL-LIO Radar to AL-LIO boundary. */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
let errors = 0;

function read(path) {
  const fullPath = join(root, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function check(label, condition) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`  FAIL  ${label}`);
    errors += 1;
  }
}

const ingestRoute = read("src/app/api/radar/v1/ingest/route.ts");
const contract = read("src/lib/radar/contract.ts");
const authentication = read("src/lib/radar/webhook-auth.ts");
const signature = read("src/lib/radar/signature.ts");
const repository = read("src/lib/db/repositories/radar.ts");
const v4Repository = read("src/lib/db/repositories/radar-v4.ts");
const v4Projection = read("src/lib/radar/v4-projection.ts");
const newsRoute = read("src/app/api/news/route.ts");
const compose = read("infra/docker-compose.prod.yml");
const radarService = compose.split("  al_lio_radar:")[1]?.split("  al_lio_migrator:")[0] ?? "";

check("Radar v1 receiver exists", Boolean(ingestRoute));
check("receiver reads the exact body before signature validation", ingestRoute.includes("request.text()"));
check("receiver enforces a body-size limit", ingestRoute.includes("RADAR_MAX_BODY_BYTES"));
check("receiver verifies HMAC authentication", ingestRoute.includes("verifyRadarWebhook"));
check("receiver rejects header/body schema mismatches", ingestRoute.includes("schema version mismatch"));
check("receiver persists through a transactional operation", ingestRoute.includes("ingestRadarDelivery"));

check("contract emits schemaVersion 3", contract.includes("RADAR_SCHEMA_VERSION = 3") && contract.includes("schemaVersion: z.literal(RADAR_SCHEMA_VERSION)"));
check("receiver keeps schemaVersion 2 rollout compatibility", contract.includes("RADAR_LEGACY_SCHEMA_VERSION = 2") && authentication.includes("RADAR_SUPPORTED_SCHEMA_VERSIONS"));
check("receiver adds strict schemaVersion 4 compatibility", contract.includes("RADAR_V4_SCHEMA_VERSION = 4") && contract.includes("radarDeliveryV4Schema"));
check("v4 requires field evidence whose hash matches the fact value", contract.includes("Verified fact ${fieldPath} requires matching field-level evidence") && contract.includes("radarV4ValueHash"));
check("v4 derived copy requires explicit provenance", contract.includes("requires explicit provenance") && contract.includes("sourceFields"));
check("contract requires explicit destinations and semantic keys", contract.includes("RADAR_DESTINATIONS") && contract.includes("semanticKey"));
check("contract accepts approved items only", contract.includes('reviewStatus: z.literal("approved")'));
check("contract requires a complete publication audit", contract.includes("reviewedBy: z.string().trim().min(1)") && contract.includes("reviewReason: z.string().trim().min(1)"));
check("contract restricts known cycle codes", ["DAW", "DAM", "AF", "TSAF", "MP"].every((cycle) => contract.includes(`"${cycle}"`)));
check("contract permits HTTPS URLs only", contract.includes('protocol === "https:"') && contract.includes("canonicalUrl: httpsUrl"));

check("signature uses SHA-256", signature.includes('createHmac("sha256"'));
check("signature comparison is timing-safe", signature.includes("timingSafeEqual"));
check("signature binds timestamp, deliveryId, and exact body", signature.includes('`${timestamp}.${deliveryId}.${rawBody}`'));
check("anti-replay protection uses a bounded window", authentication.includes("RADAR_TIMESTAMP_TOLERANCE_MS"));

check("ingest uses a PostgreSQL transaction", repository.includes("withTransaction"));
check("deliveries are idempotent", repository.includes("payload_hash") && repository.includes("duplicate"));
check("queries filter by cycle in PostgreSQL", repository.includes("ANY(item.target_cycle_codes)"));
check("queries exclude expired content", repository.includes("item.expires_at IS NULL") && repository.includes("item.expires_at > now()"));
check("News receives only current news and legal content", repository.includes("item.destination = 'news'") && repository.includes("interval '7 days'") && repository.includes("interval '30 days'") && repository.includes("state.status = 'saved'"));
check("course and event destinations materialize in the global FP catalogue", repository.includes("upsertRadarCatalogItem") && repository.includes("fp_content_cycle_fit"));
check("student state is isolated by user", repository.includes("radar_item_user_states") && repository.includes("user_id"));
check("v4 persists canonical entities, occurrences and revisions", v4Repository.includes("radar_content_entities") && v4Repository.includes("radar_content_occurrences") && v4Repository.includes("radar_content_revisions"));
check("v4 preserves last-known-good facts on missing extraction", v4Projection.includes("source_unavailable") && v4Projection.includes("kept_last_known_good"));
check("v4 projection is destination-flagged and disabled by default", v4Projection.includes("AL_LIO_RADAR_V4_PROJECT_DESTINATIONS") && v4Projection.includes('raw = process.env.AL_LIO_RADAR_V4_PROJECT_DESTINATIONS ?? ""'));
check("v4 identity aliases reuse canonical occurrences", v4Repository.includes("radar_content_identity_aliases") && v4Repository.includes("canonical-occurrence-key-transition"));
check("v4 legacy catalogue projection reuses existing rows", v4Repository.includes("legacy_fp_content_item_id") && v4Repository.includes("radar_semantic_key = $1"));

check("News obtains the authenticated profile cycle", newsRoute.includes("getProfileByUser") && newsRoute.includes("profile.cycle_code"));
check("News queries only the Radar repository", newsRoute.includes("listRadarItemsForCycle"));
check("legacy JSON synchronization is disabled", read("src/app/api/news/sync/route.ts").includes("410"));
check("legacy general-news source registry does not exist", !existsSync(join(root, "src/lib/sources/source-registry.ts")));
check("legacy News fetcher does not exist", !existsSync(join(root, "src/lib/news/fetchers.ts")));

check("Compose shares the secret through environment only", compose.includes("AL_LIO_RADAR_WEBHOOK_SECRET"));
check("Compose keeps Radar isolated from PostgreSQL", Boolean(radarService) && !radarService.includes("DATABASE_URL:"));
check("Compose persists the Radar queue", compose.includes("al_lio_radar_data:/app/data"));

if (errors > 0) {
  console.error(`\nRESULT: ${errors} Radar integration issue(s).`);
  process.exit(1);
}

console.log("\nRESULT: AL-LIO Radar integration validated.");
