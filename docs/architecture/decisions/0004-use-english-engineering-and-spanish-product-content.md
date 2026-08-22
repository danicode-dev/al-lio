# ADR-0004: Use English engineering and Spanish product content

**Status:** Accepted

## Context

The Aircury programme requires produced code to use English. AL-LIO is designed
for Spanish-speaking students and its curricular names, source titles and UI
must remain natural for that audience.

## Decision

Use English for source identifiers, comments, logs, tests, technical
documentation, issues and pull requests. Keep Spanish user-facing copy,
official programme names and curated educational content as localised product
data. Existing Spanish route slugs remain compatible until an explicit routing
migration is justified.

## Consequences

- Engineering material is accessible and consistent with the programme.
- The product does not sacrifice its intended audience to satisfy an internal
  naming rule.
- Embedded Spanish UI strings should move progressively into localisation
  resources rather than being translated to English on screen.
- Internal Spanish identifiers are technical debt to remove through focused,
  compatibility-preserving changes, not a risky mass rename.

## Evidence

- Root `README.md`
- `docs/README.md`
- Spanish product copy in `src/components/`
- Spanish curriculum and catalogue inputs in `csv/`
