/** Validación estática de la frontera AL-LÍO Radar -> AL-LÍO. */

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
const repository = read("src/lib/db/repositories/radar.ts");
const newsRoute = read("src/app/api/news/route.ts");
const compose = read("infra/docker-compose.prod.yml");
const radarService = compose.split("  al_lio_radar:")[1]?.split("  al_lio_migrator:")[0] ?? "";

check("existe el receptor Radar v1", Boolean(ingestRoute));
check("el receptor valida el cuerpo sin parsearlo antes de firmar", ingestRoute.includes("request.text()"));
check("el receptor limita el tamaño del cuerpo", ingestRoute.includes("RADAR_MAX_BODY_BYTES"));
check("el receptor verifica autenticación HMAC", ingestRoute.includes("verifyRadarWebhook"));
check("el receptor persiste mediante una operación transaccional", ingestRoute.includes("ingestRadarDelivery"));

check("el contrato exige schemaVersion 2", contract.includes("RADAR_SCHEMA_VERSION = 2") && contract.includes("schemaVersion: z.literal(RADAR_SCHEMA_VERSION)"));
check("el contrato solo admite elementos aprobados", contract.includes('reviewStatus: z.literal("approved")'));
check("el contrato exige auditoría humana completa", contract.includes("reviewedBy: z.string().trim().min(1)") && contract.includes("reviewReason: z.string().trim().min(1)"));
check("el contrato restringe los ciclos conocidos", ["DAW", "DAM", "AF", "TSAF", "MP"].every((cycle) => contract.includes(`"${cycle}"`)));
check("el contrato solo permite URLs HTTPS", contract.includes('protocol === "https:"') && contract.includes("canonicalUrl: httpsUrl"));

check("la firma usa SHA-256", authentication.includes('createHmac("sha256"'));
check("la comparación de firma es constante", authentication.includes("timingSafeEqual"));
check("la firma incluye timestamp, deliveryId y cuerpo", authentication.includes('`${timestamp}.${deliveryId}.${rawBody}`'));
check("la protección anti-replay tiene ventana limitada", authentication.includes("RADAR_TIMESTAMP_TOLERANCE_MS"));

check("la ingesta usa transacción PostgreSQL", repository.includes("withTransaction"));
check("las entregas son idempotentes", repository.includes("payload_hash") && repository.includes("duplicate"));
check("la consulta filtra por ciclo en PostgreSQL", repository.includes("ANY(item.target_cycle_codes)"));
check("la consulta excluye contenido caducado", repository.includes("item.expires_at IS NULL") && repository.includes("item.expires_at > now()"));
check("el estado del alumno queda aislado por usuario", repository.includes("radar_item_user_states") && repository.includes("user_id"));

check("Noticias obtiene el ciclo del perfil autenticado", newsRoute.includes("getProfileByUser") && newsRoute.includes("profile.cycle_code"));
check("Noticias consulta únicamente el repositorio Radar", newsRoute.includes("listRadarItemsForCycle"));
check("el sincronizador JSON legacy está deshabilitado", read("src/app/api/news/sync/route.ts").includes("410"));
check("no existe el registro de fuentes generalistas legacy", !existsSync(join(root, "src/lib/sources/source-registry.ts")));
check("no existe el fetcher legacy de Noticias", !existsSync(join(root, "src/lib/news/fetchers.ts")));

check("Compose comparte el secreto solo por entorno", compose.includes("AL_LIO_RADAR_WEBHOOK_SECRET"));
check("Compose mantiene Radar separado de PostgreSQL", Boolean(radarService) && !radarService.includes("DATABASE_URL:"));
check("Compose persiste la cola de Radar", compose.includes("al_lio_radar_data:/app/data"));

if (errors > 0) {
  console.error(`\nRESULTADO: ${errors} problema(s) en la integración Radar.`);
  process.exit(1);
}

console.log("\nRESULTADO: integración AL-LÍO Radar validada.");
