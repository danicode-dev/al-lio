# Aircury technical report source

This directory is the maintained source of truth for the AL-LIO technical
report delivered under Aircury Summer of Code 2026. GitHub issues coordinate
the work; documents in this directory contain only reviewed decisions,
reproducible evidence and report-ready technical explanations.

The final PDF will be produced from an owner-supplied template after the
evidence set and report narrative are complete. The repository is not the
delivery channel for signed forms, identity documents or other private
programme material.

## Working rules

- Describe one immutable application release and its matching production
  deployment. Never cite a moving branch as the final version.
- Attach every material claim to a stable evidence ID from
  [`02-evidence-register.md`](02-evidence-register.md).
- Distinguish delivered behaviour, measured results, expected impact and
  planned work.
- Count only the records that satisfy the same publication boundary as the
  student-facing application. Raw CSV rows, rejected candidates, retired
  resources and historical records are not published-content metrics.
- Keep all personal data, credentials, raw database rows, private survey
  responses and operational secrets outside Git.
- Prefer an accurate omission over an estimate that cannot be reproduced.
- Write the final report to explain the project completely without padding or
  an arbitrary page target.

## Documents

| File | Purpose | Status |
|---|---|---|
| [`01-delivery-brief.md`](01-delivery-brief.md) | Owner-confirmed delivery decisions and immutable delivery release | Frozen; remaining measurements are tracked separately |
| [`02-evidence-register.md`](02-evidence-register.md) | Evidence model, metric provenance, collection commands and aggregate-query definitions | Active |
| [`03-product-and-user-journeys.md`](03-product-and-user-journeys.md) | Delivered scope and student journeys | Active; final-release checks pending |
| [`04-architecture-data-and-security.md`](04-architecture-data-and-security.md) | Architecture, governance, privacy and security | Active; final-release checks pending |
| [`05-quality-release-and-operations.md`](05-quality-release-and-operations.md) | Verification, release and support evidence | Active; frozen-release CI, deployment and health evidence recorded; backup/restore and remaining metric evidence pending |
| [`06-impact-inclusion-and-sustainability.md`](06-impact-inclusion-and-sustainability.md) | Social impact, inclusion and operating sustainability | Active; owner/final evidence pending |
| `07-product-visual-evidence.md` | Final owner-captured visual evidence and captions; not a capture plan | Planned in issue #301 |
| `08-technical-report-source.md` | Consolidated report narrative used to fill the final PDF template | Planned in issue #302 |

Only create a planned file when its issue has enough verified information to
own it. Empty placeholders and duplicated plans make the report harder to
audit.

## Evidence workflow

1. Record the proposed claim and collection method in the evidence register.
2. Use the frozen release, production deployment and reporting cut-off recorded in `01-delivery-brief.md`.
3. Run the documented command or aggregate query against that exact boundary.
4. Record the result, timestamp, collector and privacy classification.
5. Verify the result independently against code, configuration or a second
   source where the claim is material.
6. Reference the evidence ID from the relevant technical document.
7. Include the claim in the final report only after its status is `verified`.

Visual evidence follows the same model. Issue #301 defines the mandatory set
and review gates; the owner captures all frames together after the final
release is frozen.

## Public and private boundaries

Public report material may include aggregate counts, release references,
architecture, public URLs, public-source provenance and fictional product
states.

The following never belong in this directory:

- participant identity documents or signatures;
- academic, banking or tax documents;
- production credentials, tokens, cookies or environment files;
- raw student records, emails, notes, tasks, calendar entries or applications;
- raw user-study responses that could identify a participant;
- internal hostnames, private runbooks or unredacted logs.

