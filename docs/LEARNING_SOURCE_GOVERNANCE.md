# Learning-source governance

## Scope

The competency catalogue publishes individual Spanish-language learning
resources. A competency becomes visible only when it has at least one approved
resource.

The label `AL-LIO essential` is an editorial recommendation. It does not
replace the official curriculum, an accredited qualification or professional
instruction.

## Acceptance criteria

- The resource directly teaches the competency to which it is linked.
- The title, channel, URL and actual video agree with the catalogue record.
- The content is in Spanish and can be followed without buying another
  product.
- The presenter or publisher is identifiable and sufficiently credible for
  the subject.
- The resource avoids unrelated news, entertainment, sensationalism,
  unrealistic earnings claims and keyword-only relevance.
- Health and first-aid resources prefer recognised organisations and clearly
  state that video cannot replace accredited practical training.
- Example training sessions are observation and analysis material, not a
  professional qualification.

## Review workflow

1. Run `npm run validate:learning-competencies` before import.
2. Run `npm run validate:learning-sources` with Internet access to confirm
   availability and channel ownership.
3. Manually review the introduction, structure, language, commercial calls to
   action and direct curricular fit.
4. Import with `npm run import:learning-competencies`; the operation is
   transactional and deactivates withdrawn resources.
5. Repeat editorial review every quarter or when a student reports a resource.

## Immediate withdrawal

A resource is disabled immediately if it becomes unavailable, changes owner or
language, introduces dangerous claims, becomes primarily commercial or no
longer teaches the assigned competency. When in doubt, disable first and find a
replacement second.

## Evidence

Review evidence should record the reviewer, review date, competency, source URL
and decision. Credentials, private notes and personal student information must
not be committed with the catalogue.
