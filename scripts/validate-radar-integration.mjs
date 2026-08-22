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
const newsRoute = read("src/app/api/news/route.ts");
const compose = read("infra/docker-compose.prod.yml");
const radarService = compose.split("  al_lio_radar:")[1]?.split("  al_lio_migrator:")[0] ?? "";

check("Radar v1 receiver exists", Boolean(ingestRoute));
check("receiver reads the exact body before signature validation", ingestRoute.includes("request.text()"));
check("receiver enforces a body-size limit", ingestRoute.includes("RADAR_MAX_BODY_BYTES"));
check("receiver verifies HMAC authentication", ingestRoute.includes("verifyRadarWebhook"));
check("receiver persists through a transactional operation", ingestRoute.includes("ingestRadarDelivery"));

check("contract requires schemaVersion 2", contract.includes("RADAR_SCHEMA_VERSION = 2") && contract.includes("schemaVersion: z.literal(RADAR_SCHEMA_VERSION)"));
check("contract accepts approved items only", contract.includes('reviewStatus: z.literal("approved")'));
check("contract requires a complete human-review audit", contract.includes("reviewedBy: z.string().trim().min(1)") && contract.includes("reviewReason: z.string().trim().min(1)"));
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
check("student state is isolated by user", repository.includes("radar_item_user_states") && repository.includes("user_id"));

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
