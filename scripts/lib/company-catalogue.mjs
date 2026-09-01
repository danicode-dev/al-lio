import { createHash } from "node:crypto";

// Pure logic for loading, identifying and validating a company catalogue
// dataset. Kept dependency-free (no React/Next) so it can be imported
// directly by the Node test runner, and shared between the importer and any
// future validate-only entry point instead of duplicating the rules twice.

export const ALLOWED_CYCLE_GROUPS = ["DEV", "AF", "MP", "TSAF"];
export const SUPPORTED_SCHEMA_VERSIONS = [1];
export const ALLOWED_DATASET_STATUSES = ["pending_owner_review", "approved"];
const COMPANY_NAMESPACE = "companies-v1";

// Destinations that must never appear as `web`, `empleo` or `fuente`: job
// aggregators/search, social media, generic directories, link shorteners.
// LinkedIn/Google/etc. may still be used to *discover* a candidate - they
// just can never be the URL a student is sent to.
const BLOCKED_HOST_PATTERNS = [
  /(^|\.)linkedin\.com$/i,
  /(^|\.)infojobs\.net$/i,
  /(^|\.)indeed\.[a-z.]+$/i,
  /(^|\.)talent\.com$/i,
  /(^|\.)glassdoor\.[a-z.]+$/i,
  /(^|\.)google\.[a-z.]+$/i,
  /(^|\.)bing\.com$/i,
  /(^|\.)facebook\.com$/i,
  /(^|\.)instagram\.com$/i,
  /(^|\.)twitter\.com$/i,
  /(^|\.)x\.com$/i,
  /(^|\.)tiktok\.com$/i,
  /(^|\.)paginasamarillas\.es$/i,
  /(^|\.)bit\.ly$/i,
  /(^|\.)tinyurl\.com$/i,
  /(^|\.)t\.co$/i,
  /(^|\.)wa\.me$/i,
];

export function stableUuid(namespace, slug) {
  const bytes = createHash("sha1").update(`${namespace}:${slug}`).digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// DEV keeps its original, unprefixed slug/UUID scheme so the 69 existing
// rows and their favourites keep their exact identity forever. Every other
// group gets its slug namespaced by group, so the same company name in two
// different groups can never collide onto the same row.
export function idSlugFor(cycleGroup, nombre) {
  const base = slugify(nombre);
  if (!base) return null;
  return cycleGroup === "DEV" ? base : `${cycleGroup.toLowerCase()}-${base}`;
}

function cleanText(value) {
  const v = typeof value === "string" ? value.trim() : "";
  return v === "" ? null : v;
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isBlockedWebHost(url) {
  const host = hostnameOf(url);
  if (!host) return false;
  return BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(host));
}

export function isHttpUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// Strict "YYYY-MM-DD" check - rejects both malformed strings and values a
// lenient Date constructor would silently roll over (e.g. "2026-02-30").
export function isValidReviewedAt(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

// Loads either the legacy DEV markdown source (a ```json block embedded in
// public/data/empresas_tech_granada.md) or a new-style JSON dataset file
// ({ cycleGroup, companies: [...] } or a bare array).
export function parseDatasetSource(sourceText, sourcePath) {
  if (sourcePath.endsWith(".md")) {
    const match = sourceText.match(/```json\s*([\s\S]*?)```/);
    if (!match) throw new Error(`No JSON block found in markdown source: ${sourcePath}`);
    return { cycleGroupInFile: null, rows: JSON.parse(match[1]) };
  }

  const parsed = JSON.parse(sourceText);
  if (Array.isArray(parsed)) return { cycleGroupInFile: null, rows: parsed };
  if (Array.isArray(parsed.companies)) {
    return {
      cycleGroupInFile: parsed.cycleGroup ?? null,
      schemaVersion: parsed.schemaVersion ?? null,
      status: parsed.status ?? null,
      reviewedAt: parsed.reviewedAt ?? null,
      reviewedBy: parsed.reviewedBy ?? null,
      rows: parsed.companies,
    };
  }
  throw new Error(`Unrecognized dataset shape in ${sourcePath}: expected an array or a { companies: [...] } object`);
}

// Validates a raw dataset against the source policy and returns
// { errors, warnings, records }. `records` are DB-ready rows (present even
// when errors exist, for diagnostics) - the caller must not write them if
// errors is non-empty. `existingIdentities` is an optional
// Map<id_slug, cycle_group> of rows already in the database, used to catch a
// slug that would silently jump to a different group.
export function validateDataset({
  cycleGroupInFile,
  rows,
  cycleGroup,
  existingIdentities = new Map(),
  schemaVersion,
  status,
  reviewedAt,
  reviewedBy,
}) {
  const errors = [];
  const warnings = [];

  if (!ALLOWED_CYCLE_GROUPS.includes(cycleGroup)) {
    errors.push(`Unknown cycle group: ${cycleGroup} (allowed: ${ALLOWED_CYCLE_GROUPS.join(", ")})`);
    return { errors, warnings, records: [] };
  }
  if (cycleGroupInFile && cycleGroupInFile !== cycleGroup) {
    errors.push(`Dataset declares cycleGroup="${cycleGroupInFile}" but --cycle-group="${cycleGroup}" was given`);
  }

  // DEV's legacy markdown source predates this review envelope entirely and
  // is already grandfathered elsewhere in this file - it never carries
  // schemaVersion/status/reviewedAt/reviewedBy, so it is exempt here too.
  // Every other group must declare a valid, owner-approved envelope before
  // anything from it can be written. This check runs unconditionally
  // (including under --dry-run), so a pending dataset can still be fully
  // validated - only the resulting `errors` entry (which the importer
  // already refuses to write past) blocks the actual import.
  if (cycleGroup !== "DEV") {
    if (!SUPPORTED_SCHEMA_VERSIONS.includes(schemaVersion)) {
      errors.push(`schemaVersion must be one of ${SUPPORTED_SCHEMA_VERSIONS.join(", ")}, got ${JSON.stringify(schemaVersion)}`);
    }
    if (!ALLOWED_DATASET_STATUSES.includes(status)) {
      errors.push(`status must be one of ${ALLOWED_DATASET_STATUSES.join(", ")}, got ${JSON.stringify(status)}`);
    } else if (status !== "approved") {
      errors.push(`status is "${status}" - the dataset must be status="approved" (set by the owner after review) before anything can be imported`);
    }
    if (!isValidReviewedAt(reviewedAt)) {
      errors.push(`reviewedAt must be a valid "YYYY-MM-DD" date, got ${JSON.stringify(reviewedAt)}`);
    }
    if (!cleanText(reviewedBy)) {
      errors.push("reviewedBy is required");
    }
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    errors.push("Dataset has no rows to import");
    return { errors, warnings, records: [] };
  }

  const seenNombre = new Set();
  const seenDomain = new Set();
  const seenWeb = new Set();
  const seenSlug = new Set();
  const records = [];

  rows.forEach((raw, index) => {
    const label = `row[${index}] (${raw?.nombre ?? "sin nombre"})`;
    const errorsBeforeRow = errors.length;

    const nombre = cleanText(raw?.nombre);
    if (!nombre) {
      errors.push(`${label}: nombre is required`);
      return;
    }

    const web = cleanText(raw?.web);
    if (!web) {
      errors.push(`${label}: web is required`);
    } else if (!isHttpUrl(web)) {
      errors.push(`${label}: web must be an http(s) URL, got "${web}"`);
    } else if (isBlockedWebHost(web)) {
      errors.push(`${label}: web points to a job board/social/aggregator/shortener host, not an official site ("${web}")`);
    }

    const categoria = cleanText(raw?.categoria);
    if (!categoria) errors.push(`${label}: categoria is required`);

    const granadaNote = cleanText(raw?.granada);
    if (!granadaNote) errors.push(`${label}: granada is required`);

    const fuente = cleanText(raw?.fuente);
    if (!fuente) {
      errors.push(`${label}: fuente is required`);
    } else if (!isHttpUrl(fuente)) {
      errors.push(`${label}: fuente must be an http(s) URL, got "${fuente}"`);
    } else if (cycleGroup !== "DEV" && isBlockedWebHost(fuente)) {
      // Same exemption as empleo above: 2 of DEV's 69 rows cite a
      // LinkedIn/InfoJobs page as their historical research source. Every
      // other group follows the strict "official source only" rule.
      errors.push(`${label}: fuente points to a job board/social/aggregator/shortener host, not an official site ("${fuente}")`);
    }

    // DEV's 69 pre-existing rows carry historical LinkedIn/InfoJobs search
    // links in `empleo`/`tipo_empleo` from before this policy existed - the
    // field is never rendered in the UI (CompanyCard only ever uses `web`),
    // so those rows are grandfathered rather than rejected/rewritten. The
    // strict "official source only" rule applies to every group going
    // forward, i.e. everything except DEV.
    const empleoUrl = cleanText(raw?.empleo);
    const tipoEmpleo = cleanText(raw?.tipo_empleo);
    if (cycleGroup !== "DEV" && empleoUrl) {
      if (!isHttpUrl(empleoUrl)) errors.push(`${label}: empleo must be an http(s) URL when present, got "${empleoUrl}"`);
      else if (isBlockedWebHost(empleoUrl)) errors.push(`${label}: empleo points to a job board/social/aggregator/shortener host ("${empleoUrl}")`);
    } else if (cycleGroup !== "DEV" && !empleoUrl && tipoEmpleo) {
      errors.push(`${label}: tipo_empleo is set but empleo is empty`);
    }

    const normalizedNombre = slugify(nombre);
    if (seenNombre.has(normalizedNombre)) errors.push(`${label}: duplicate company name within this dataset`);
    seenNombre.add(normalizedNombre);

    if (web) {
      const domain = hostnameOf(web);
      if (domain) {
        if (seenDomain.has(domain)) warnings.push(`${label}: another row in this dataset already uses domain "${domain}" - please confirm these are not duplicates`);
        seenDomain.add(domain);
      }
      if (seenWeb.has(web)) errors.push(`${label}: duplicate web URL within this dataset`);
      seenWeb.add(web);
    }

    const idSlug = idSlugFor(cycleGroup, nombre);
    if (!idSlug) {
      errors.push(`${label}: could not derive a slug from nombre`);
      return;
    }
    if (seenSlug.has(idSlug)) errors.push(`${label}: duplicate slug within this dataset ("${idSlug}")`);
    seenSlug.add(idSlug);

    const existingGroup = existingIdentities.get(idSlug);
    if (existingGroup && existingGroup !== cycleGroup) {
      errors.push(`${label}: slug "${idSlug}" already exists in the database under cycle_group="${existingGroup}" - refusing to move it to "${cycleGroup}"`);
    }

    // Only a row with zero errors of its own becomes a candidate record.
    // (The importer still refuses to write anything at all when the
    // dataset-wide `errors` array is non-empty - this is a second, more
    // conservative layer so `records` alone is never misleading to a future
    // caller that forgets to check `errors` first.)
    if (errors.length === errorsBeforeRow) {
      records.push({
        id: stableUuid(COMPANY_NAMESPACE, idSlug),
        id_slug: idSlug,
        nombre,
        web,
        empleo_url: empleoUrl,
        tipo_empleo: empleoUrl ? tipoEmpleo : null,
        categoria,
        granada_note: granadaNote,
        fuente,
        cycle_group: cycleGroup,
        sort_order: (index + 1) * 10,
      });
    }
  });

  return { errors, warnings, records };
}
