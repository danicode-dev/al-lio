# Verified news list/detail contract

## One authorised dataset

`listRadarItemsForCycle`, `getRadarItemDetailForUser`, `getNextRadarNewsItem`, and read/save mutations share the same server-side boundary:

- the authenticated profile cycle must be present in `target_cycle_codes`;
- destination is `news` and kind is `news` or `legal`;
- a live item must be unexpired and within the seven-day news or thirty-day legal window;
- a previously saved item remains available in that user's private archive;
- cross-cycle, non-news, stale-unsaved, and missing IDs all return the same not-found result.

The next item is selected from the exact same ordered list. It does not run a broader related query and cannot expose another cycle by ID or adjacency.

## Canonical v4 fields

The list continues to use the compatibility `radar_items` identity so existing `radar_item_user_states` rows survive revisions. When a v4 occurrence has been projected, queries join its accepted canonical occurrence by `legacy_radar_item_id` and expose:

- compact `summaryShort` for cards;
- source-backed `summaryExpanded` and `keyFacts` for detail;
- derived `whyRelevant`, rendered in a separate section;
- source update and verification timestamps;
- language and deterministic match reasons;
- ranking priority, revision, fingerprint, and primary evidence metadata.

Optional sections disappear when absent. The detail page does not manufacture missing dates, summaries, sources, facts, or relevance copy. The original CTA uses the canonical article URL. Full article bodies are never stored or republished.

## Revision and user-state ownership

Radar owns source facts, evidence, classification, publication decision, identity, and revision. AL-LÍO owns read/saved state. v4 compatibility projection reuses the legacy `radar_items.id`, so a new material revision updates the same logical article without replacing the user's status row.

The v4 news projection remains disabled unless `AL_LIO_RADAR_V4_PROJECT_DESTINATIONS` explicitly includes `news`. The additive migration is safe to deploy before activation.
