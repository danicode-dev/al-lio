import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const catalog = JSON.parse(await readFile(resolve("data/learning-competencies.json"), "utf8"));
const failures = [];
const checked = [];

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function inspectResource(resource) {
  try {
    const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(resource.youtubeUrl)}&format=json`;
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const metadata = await response.json();
    const expectedProvider = normalize(resource.provider);
    const actualProvider = normalize(metadata.author_name ?? "");
    if (!actualProvider.includes(expectedProvider) && !expectedProvider.includes(actualProvider)) {
      throw new Error(`canal inesperado: ${metadata.author_name ?? "sin canal"}`);
    }
    checked.push({ id: resource.id, title: metadata.title, provider: metadata.author_name });
  } catch (error) {
    failures.push(`${resource.id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

for (let index = 0; index < catalog.resources.length; index += 6) {
  await Promise.all(catalog.resources.slice(index, index + 6).map(inspectResource));
}

console.log(`Comprobados ${checked.length}/${catalog.resources.length} vídeos contra YouTube oEmbed.`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}

console.log("OK: todos los vídeos están disponibles y pertenecen al canal editorial esperado.");
