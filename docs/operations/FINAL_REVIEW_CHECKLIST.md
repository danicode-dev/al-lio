# Final owner review checklist

This checklist records the reviewed state for the first AL-LIO release. Open
boxes are deliberate owner-operated follow-up work rather than hidden release
claims.

## 1. Repository and compliance

- [x] Product claims match the deployed application.
- [x] AL-LIO is public, MIT-licensed and credits Aircury SL.
- [x] No tracked secret, dump, private key or personal-data file was detected.
- [x] Engineering source, maintained technical documentation and GitHub
  collaboration material use English.
- [x] Spanish UI, curriculum and editorial data remain intentionally localized.
- [x] The independent Radar boundary remains preserved.

## 2. Automated verification

- [x] AL-LIO `npm run ci` passes from a clean installation.
- [x] Radar `npm run ci` passes, including 180 tests and the production build.
- [x] GitHub Actions, CodeQL and dependency review passed for merged delivery
  changes.
- [x] Production dependency audits report no known vulnerabilities.
- [x] Markdown links and engineering-language checks pass in both repositories.
- [x] AL-LIO `main` rejects force pushes and deletions and requires current CI
  checks before future changes are merged.

## 3. Product verification

- [x] One fictional production account was tested for DAW, DAM, AF, TSAF and MP.
- [x] Dashboard, tasks, profile, learning progress, notes and navigation persist.
- [x] News remains Spanish-audience, cycle-filtered and free of general local
  crime or unrelated newspaper content in the reviewed sample.
- [x] Desktop and mobile login layouts were checked without console errors.
- [x] Job Radar rejects unauthenticated access and validates authenticated input.
- [ ] Select and approve the final public screenshots and presentation copy.

## 4. Radar editorial controls

- [x] The authoritative catalogue contains 13 enabled, 11 pending-validation and
  8 reference-only sources.
- [x] Every enabled source requires explicit human review.
- [x] Enabled sources provide at least three reviewed catalogue routes per cycle,
  including strict shared BOE routing.
- [x] DAW and DAM remain distinct; AI and Granada are topics, not cycle codes.
- [x] Pending sources remain disabled until their technical and editorial
  evidence is complete.
- [x] The application never displays pending or rejected Radar candidates.

## 5. Production and recovery

- [x] The web image is identified by the reviewed Git commit SHA.
- [x] Web-only deployment preserved Radar and PostgreSQL container identities.
- [x] Public liveness, readiness and authentication-boundary checks pass.
- [x] The previous web image remains available for rollback.
- [x] SSH public-key access works and KVM recovery is documented.
- [ ] Configure external monitoring and named alert recipients.
- [ ] Replicate encrypted backups outside the VPS.
- [ ] Complete and record an isolated restore exercise.

## 6. Release and presentation

- [x] Delivery changes were merged through reviewed pull requests.
- [x] Incompatible automated dependency pull requests were not merged.
- [x] The first release is recorded as `v0.1.0` after required checks pass.
- [x] The authenticated production smoke test was completed by the owner.
- [ ] Approve the final screenshots and presentation narrative.

## Manual follow-up

The remaining manual work is limited to presentation approval, external
monitoring ownership and off-host backup/restore evidence. These controls must
be completed before claiming full long-term operational readiness.
