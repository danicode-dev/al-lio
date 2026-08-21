import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const path = resolve("data/learning-competencies.json");
const catalog = JSON.parse(await readFile(path, "utf8"));
const errors = [];
const cycleCodes = new Set(["DAW", "DAM", "AF", "MP", "TSAF"]);
const requirements = new Set(["essential", "recommended"]);
const levels = new Set(["inicial", "intermedio", "avanzado"]);

function requiredString(value, label) {
  if (typeof value !== "string" || !value.trim()) errors.push(`${label} es obligatorio`);
}

if (catalog.schemaVersion !== 1) errors.push("schemaVersion debe ser 1");
requiredString(catalog.reviewedAt, "reviewedAt");
requiredString(catalog.reviewedBy, "reviewedBy");
requiredString(catalog.disclaimer, "disclaimer");
if (!/^\d{4}-\d{2}-\d{2}$/.test(catalog.reviewedAt ?? "")) errors.push("reviewedAt debe usar YYYY-MM-DD");
if (!Array.isArray(catalog.competencies) || catalog.competencies.length === 0) errors.push("competencies debe contener elementos");
if (!Array.isArray(catalog.resources) || catalog.resources.length === 0) errors.push("resources debe contener elementos");

const resourceIds = new Set();
const resourceSlugs = new Set();
for (const [index, resource] of (catalog.resources ?? []).entries()) {
  const label = `resources[${index}]`;
  for (const key of ["id", "slug", "title", "description", "provider", "youtubeUrl"]) requiredString(resource[key], `${label}.${key}`);
  if (resourceIds.has(resource.id)) errors.push(`${label}.id duplicado: ${resource.id}`);
  if (resourceSlugs.has(resource.slug)) errors.push(`${label}.slug duplicado: ${resource.slug}`);
  resourceIds.add(resource.id);
  resourceSlugs.add(resource.slug);
  if (!levels.has(resource.level)) errors.push(`${label}.level no permitido`);
  if (!/^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/.test(resource.youtubeUrl ?? "")) errors.push(`${label}.youtubeUrl no es un vídeo individual de YouTube`);
  if (resource.durationSeconds != null && (!Number.isInteger(resource.durationSeconds) || resource.durationSeconds <= 0)) errors.push(`${label}.durationSeconds no es válido`);
}

const competencyIds = new Set();
const competencyKeys = new Set();
const cyclesWithContent = new Set();
const usedResourceIds = new Set();
for (const [index, competency] of (catalog.competencies ?? []).entries()) {
  const label = `competencies[${index}]`;
  for (const key of ["id", "cycleCode", "slug", "title", "description"]) requiredString(competency[key], `${label}.${key}`);
  if (!cycleCodes.has(competency.cycleCode)) errors.push(`${label}.cycleCode no permitido`);
  if (!requirements.has(competency.requirement)) errors.push(`${label}.requirement no permitido`);
  if (!Number.isInteger(competency.sortOrder) || competency.sortOrder <= 0) errors.push(`${label}.sortOrder no es válido`);
  if (competencyIds.has(competency.id)) errors.push(`${label}.id duplicado: ${competency.id}`);
  const key = `${competency.cycleCode}:${competency.slug}`;
  if (competencyKeys.has(key)) errors.push(`${label} duplicada: ${key}`);
  competencyIds.add(competency.id);
  competencyKeys.add(key);
  cyclesWithContent.add(competency.cycleCode);
  if (!Array.isArray(competency.resourceIds) || competency.resourceIds.length === 0) errors.push(`${label}.resourceIds debe contener recursos`);
  if (new Set(competency.resourceIds ?? []).size !== (competency.resourceIds ?? []).length) errors.push(`${label}.resourceIds contiene duplicados`);
  for (const resourceId of competency.resourceIds ?? []) {
    if (!resourceIds.has(resourceId)) errors.push(`${label} referencia un recurso inexistente: ${resourceId}`);
    usedResourceIds.add(resourceId);
  }
}

for (const cycleCode of cycleCodes) {
  if (!cyclesWithContent.has(cycleCode)) errors.push(`Faltan competencias para ${cycleCode}`);
}
for (const resourceId of resourceIds) {
  if (!usedResourceIds.has(resourceId)) errors.push(`Recurso sin competencia: ${resourceId}`);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`FAIL: ${error}`);
  process.exit(1);
}

const summary = [...cycleCodes].map((cycleCode) => `${cycleCode}=${catalog.competencies.filter((item) => item.cycleCode === cycleCode).length}`).join(", ");
console.log(`OK: catálogo de aprendizaje válido (${summary}; recursos=${catalog.resources.length}).`);
