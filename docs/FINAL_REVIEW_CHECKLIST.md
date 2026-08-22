# Final owner review checklist

Use this order before approving merge, publication, or production deployment.
Do not continue after a failed blocking step.

## 1. Repository review

- [ ] Read the product overview and confirm claims match the current application.
- [ ] Review the diff in both AL-LIO and Radar; confirm no secret, dump, credential, or personal data is present.
- [ ] Confirm Spanish UI and curricular data remain intentionally localized.
- [ ] Confirm engineering documentation, comments, and collaboration files are English.
- [ ] Confirm the independent Radar boundary is still preserved.

## 2. Automated verification

- [ ] AL-LIO `npm run ci` passes from a clean checkout.
- [ ] Radar language validation, lint, type-check, 180 tests, and build pass.
- [ ] GitHub Actions syntax is accepted after push.
- [ ] CodeQL and dependency review complete without an unresolved blocking alert.
- [ ] Branch protection requires the passing CI checks before merge.

## 3. Product review

- [ ] Test one clean account for every supported cycle: DAW, DAM, AF, TSAF, and MP.
- [ ] Confirm each account starts without data belonging to another account.
- [ ] Confirm dashboard, tasks, profile, learning progress, notes, and navigation persist correctly.
- [ ] Confirm responsive layouts on desktop and mobile.
- [ ] Capture approved English project screenshots without real personal data.

## 4. Radar editorial review

- [ ] Inspect every enabled source in the source catalogue.
- [ ] Confirm sample accepted items are relevant to the assigned cycle.
- [ ] Confirm unrelated, generic, English-only, stale, and excluded items are rejected.
- [ ] Confirm every enabled source still requires human approval.
- [ ] Confirm DAW and DAM remain distinct and AI/Granada never act as cycle codes.
- [ ] Leave unproven sources pending rather than enabling them for coverage.

## 5. Operational review

- [ ] Configure external HTTPS, host-capacity, Radar heartbeat, and outbox alerts.
- [ ] Configure encrypted off-host PostgreSQL and Radar backups.
- [ ] Complete and record an isolated restore exercise.
- [ ] Confirm named alert recipients and incident escalation.
- [ ] Complete a private production release record.
- [ ] Keep the previous images available and rehearse the rollback decision.

## 6. Publication and release

- [ ] Merge through reviewed pull requests after CI succeeds.
- [ ] Re-run secret and history checks before changing Radar visibility.
- [ ] Create a release tag only for an approved, committed revision.
- [ ] Deploy only the intended release unit using the VPS runbook.
- [ ] Complete the authenticated production smoke test and observation window.

## Manual gates not solved by repository code

- External monitoring provider and notification recipients.
- Encrypted off-host backup destination, keys, retention, and scheduler.
- Final screenshot selection and presentation copy approval.
- GitHub branch protection and repository visibility settings.
- Commit, pull-request review, merge, release tag, and production deployment approval.
