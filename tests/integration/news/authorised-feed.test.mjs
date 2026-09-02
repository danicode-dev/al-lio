// Migrated mechanically from tests/security-boundaries.test.mjs for issue #274.
// Source-level assertions temporarily protect a Next.js, browser, or database boundary that the plain Node runner cannot execute; replace them when the corresponding integration harness exists.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { isValidRadarItemId } from "../../../src/lib/radar/item-id.ts";

test("News detail API route authenticates without redirecting, validates the id, and never distinguishes not-found from unauthorized", async () => {
  const source = await readFile(new URL("../../../src/app/api/news/[id]/route.ts", import.meta.url), "utf8");
  assert.match(source, /tryGetCurrentUserId/);
  assert.doesNotMatch(source, /\bgetCurrentUserId\b/);
  assert.match(source, /status:\s*401/);
  assert.match(source, /isValidRadarItemId/);
  assert.match(source, /status:\s*400/);

  const notFoundMatches = source.match(/status:\s*404/g) ?? [];
  assert.equal(
    notFoundMatches.length,
    1,
    "the detail route must return exactly one generic not-found response, never a distinct one for cross-cycle or unapproved items",
  );
  assert.doesNotMatch(source, /forbidden|cross.?cycle|not.?authorized/i);
  assert.doesNotMatch(source, /error:\s*String\(/);
});

test("Radar detail query mirrors the list boundary and deterministic next-item lookup reuses its authorised ordering", async () => {
  const source = await readFile(new URL("../../../src/lib/db/repositories/radar.ts", import.meta.url), "utf8");

  assert.match(source, /export async function getRadarItemDetailForUser/);
  assert.match(source, /item\.id = \$3::bigint/);
  assert.match(source, /ANY\(item\.target_cycle_codes\)/);
  assert.match(source, /item\.destination = 'news'/);
  assert.match(source, /item\.kind IN \('news', 'legal'\)/);
  assert.match(source, /state\.status = 'saved'/);
  assert.match(source, /interval '7 days'/);
  assert.match(source, /interval '30 days'/);
  assert.match(source, /LEFT JOIN public\.radar_content_occurrences canonical/);
  assert.match(source, /canonical\.publication_decision = 'accepted'/);
  assert.match(source, /canonical\.summary_expanded/);
  assert.match(source, /canonical\.why_relevant/);

  assert.match(source, /export async function getNextRadarNewsItem/);
  const nextFunctionSource = source.slice(source.indexOf("export async function getNextRadarNewsItem"));
  assert.match(nextFunctionSource, /listRadarItemsForCycle\(/);
  assert.doesNotMatch(nextFunctionSource, /FROM public\.radar_items/);
});

test("rejected legacy Radar news stay outside every user-facing read and mutation boundary", async () => {
  const source = await readFile(new URL("../../../src/lib/db/repositories/radar.ts", import.meta.url), "utf8");
  const approvedBoundaries = source.match(/item\.review_status = 'approved'/g) ?? [];

  assert.equal(
    approvedBoundaries.length,
    4,
    "list, statistics, status mutation and detail queries must all require approved legacy news",
  );
});

test("audited legacy Radar withdrawals hide content without deleting rows or private state", async () => {
  const source = await readFile(new URL("../../../src/lib/db/repositories/radar.ts", import.meta.url), "utf8");
  const migration = await readFile(
    new URL("../../../infra/postgres/migrations/0016_legacy_radar_news_withdrawals.sql", import.meta.url),
    "utf8",
  );
  const withdrawalBoundaries = source.match(/item\.withdrawn_at IS NULL/g) ?? [];

  assert.equal(
    withdrawalBoundaries.length,
    4,
    "list, statistics, status mutation and detail queries must all exclude withdrawn news",
  );
  assert.match(migration, /add column if not exists withdrawn_at timestamptz/);
  assert.match(migration, /radar_items_withdrawal_audit_required/);
  assert.match(migration, /withdrawn_by/);
  assert.match(migration, /withdrawal_reason/);
  assert.doesNotMatch(migration, /delete\s+from|drop\s+table|truncate\s+table/i);
});

test("News cards route into the internal detail page, never straight to the source, and never inject raw HTML", async () => {
  const source = await readFile(new URL("../../../src/features/news/client/news-view.tsx", import.meta.url), "utf8");

  // Both the featured item and every grid card carry the catalogue detail
  // action, the single way into an item.
  assert.match(source, /detailHref=\{`\/noticias\/\$\{encodeURIComponent\(item\.id\)\}`\}/);
  assert.match(source, /detailHref=\{`\/noticias\/\$\{encodeURIComponent\(featuredItem\.id\)\}`\}/);

  // The source URL is attacker-influenced content: the list never renders it
  // as a link, so it can only be reached from the detail route, which vets it.
  assert.doesNotMatch(source, /href=\{item\.url\}/);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
});

test("News detail view offers a clear Spanish source action and never injects raw HTML", async () => {
  const source = await readFile(new URL("../../../src/features/news/client/news-detail-view.tsx", import.meta.url), "utf8");
  assert.match(source, /Leer noticia original/);
  assert.match(source, /Volver a Noticias/);
  assert.match(source, /Datos confirmados/);
  assert.match(source, /Por qué puede interesarte/);
  assert.match(source, /Siguiente noticia para tu ciclo/);
  assert.doesNotMatch(source, /Todavía no hay un resumen|Fecha no indicada|Fuente no disponible/);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
});

test("Read/save mutations require the live-feed boundary before a first save, and never downgrade a saved item", async () => {
  const source = await readFile(new URL("../../../src/lib/db/repositories/radar.ts", import.meta.url), "utf8");
  const fnSource = source.slice(
    source.indexOf("export async function setRadarItemStatus"),
    source.indexOf("export async function getRadarItemDetailForUser"),
  );

  // Same cycle/destination/kind/freshness boundary as the list and detail queries.
  assert.match(fnSource, /ANY\(item\.target_cycle_codes\)/);
  assert.match(fnSource, /item\.destination = 'news'/);
  assert.match(fnSource, /item\.kind IN \('news', 'legal'\)/);
  assert.match(fnSource, /item\.expires_at IS NULL OR item\.expires_at > now\(\)/);
  assert.match(fnSource, /interval '7 days'/);
  assert.match(fnSource, /interval '30 days'/);

  // A not-yet-saved (stale) item is gated by that boundary; an already-saved one bypasses it,
  // matching the saved-archive guarantee instead of re-checking freshness on every call.
  assert.match(fnSource, /existing\.status = 'saved'/);

  // Status transitions are monotonic: saved can never be overwritten back to read.
  assert.match(fnSource, /WHEN public\.radar_item_user_states\.status = 'saved' THEN 'saved'/);

  // Upsert stays a single idempotent statement under repeated/concurrent calls.
  assert.match(fnSource, /ON CONFLICT \(user_id, radar_item_id\) DO UPDATE/);
});

test("News detail view separates unavailable content from a temporary failure, with retry only for the latter", async () => {
  const source = await readFile(new URL("../../../src/features/news/client/news-detail-view.tsx", import.meta.url), "utf8");

  // Distinct states instead of collapsing every failure into one null/loading pair.
  for (const status of ["loading", "loaded", "unavailable", "unauthenticated", "profile-incomplete", "error"]) {
    assert.match(source, new RegExp(`"${status}"`), `missing view state: ${status}`);
  }

  // 404/400 map to the generic not-found state, never to the retry-capable error state.
  const notFoundBranch = source.slice(source.indexOf("status === 404"), source.indexOf("status === 401"));
  assert.match(notFoundBranch, /status: "unavailable"/);

  // The temporary-failure state offers a real retry action and never claims the item
  // expired or doesn't belong to the student's cycle (that would be dishonest for a
  // network/server failure that has nothing to do with authorization or freshness).
  const errorBranch = source.slice(source.indexOf('state.status === "error"'), source.indexOf("const { item, nextItem } = state.data;"));
  assert.match(errorBranch, /Reintentar/);
  assert.match(errorBranch, /onClick=\{\(\) => void load\(\)\}/);
  assert.doesNotMatch(errorBranch, /caducad|no corresponda a tu ciclo/);

  // The detail query never returns kind === "event" (destination='news', kind IN news/legal
  // only), so the event-only rendering block from the original draft is unreachable and gone.
  assert.doesNotMatch(source, /item\.kind === "event"/);
});

test("The read mutation is owned by the detail route alone, never fired from the list", async () => {
  const listSource = await readFile(new URL("../../../src/features/news/client/news-view.tsx", import.meta.url), "utf8");
  const detailSource = await readFile(new URL("../../../src/features/news/client/news-detail-view.tsx", import.meta.url), "utf8");

  // The detail route is the only way into an item, so it is the only place
  // that marks one read - the list cannot double-fire the mutation.
  assert.match(detailSource, /\/read`, \{ method: "PATCH" \}/);
  assert.doesNotMatch(listSource, /\/read`/);

  // Saving stays available from the list, and stays monotonic there: an item
  // already saved never issues a second mutation.
  assert.match(listSource, /\/save`, \{ method: "PATCH" \}/);
  assert.match(listSource, /if \(item\.status === "saved"\) return;/);
});
