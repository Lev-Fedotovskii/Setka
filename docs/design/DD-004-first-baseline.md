# DD-004 — First working baseline

Date: 2026-09-06. Scope: initial development slice, not stable-v1 completion.

## Inputs actually available

Read DD-001 and DD-002 in full before implementation. The expected DD-003 was absent. `fixtures/mipt/File.xlsx` is the available workbook. Keep it unchanged. The supplied sample is a seven-record subset and has at least one stale room: C12:C13 is 515 ГК in this workbook, versus 230 ГК in the sample.

Direct inspection found one sheet, 1,813 nonempty cells, 2,708 merged ranges, 12 timetable blocks and 86 group headers. The adapter currently emits 1,080 candidates across these groups before selection. These are extraction counts, not a claim that every ambiguous candidate has been semantically resolved.

Concrete regressions: C10:K11 is one shared record with nine cohorts. C47:C49 spans slots 1–2 despite nonuniform row heights. C64:C66 spans slots 3–4. Group headers such as AV3:AW3 span physical variant columns; their width is never interpreted as parity. Each repeated Дни/Часы header starts an independent coordinate system.

## Decisions

Use standards-based ES modules, plain DOM/CSS and a static PWA. The small surface does not yet justify a component framework, build system, server database or native wrapper. Keep domain modules independent of the DOM, allowing migration to a framework or native shell without rewriting recurrence/planning.

`xlsx.js` reads archive/XML into IR; `mipt.js` infers axes and emits canonical records. JSZip 3.10.1 is vendored with its licence for offline availability. XML is read with browser DOMParser; formulas/macros are never executed. Hash the workbook, preserve raw text, and keep geometric and semantic identities distinct. No code depends on cell colors.

The baseline canonical schema is `0.1`, rather than claiming conformance to the draft `1.0`. It retains DD-001's recurrence, term parity anchor, versioned bells, cohorts, provenance and imported/personal separation. Titles, locations and instructors are inline on a series for now; registries can be introduced when cross-subject joins justify them. Session dates and minute-of-day values are explicitly interpreted in the schedule timezone. Civil-date arithmetic uses UTC to avoid host-zone/DST drift.

Do not infer a lecture from shared geometry, room, or instructor rank. Unknown kind stays `other`. Do not invent separate odd/even events from group width. Mixed-parity text is blocked pending a proper correction editor. Parallel/subgroup candidates default off and preserve all source evidence.

Store browser state under `setka.v1`; version, validate, back up and fail visibly on storage problems. Mutations snapshot state and roll back on save failure. Imported schedules and personal entities are separate. Follow-up deduplication keeps a persistent generated-key ledger independently of task status.

## Deliberate scope

Today, Week, Tasks, import review/diff, task/session planning and completion, configurable follow-ups, settings, backup and offline execution are the slice. Semester is a simple week index. The server only serves static assets; it stores no user data. Source fixture is cached to allow offline onboarding too.

Confidence is represented as actionable warnings, not a fabricated numeric probability. Type override compatibility requires matching source fingerprint and raw text. Parser refinements must add fixture regression tests and retain unresolved evidence.

## Development notes

Run `node server.mjs`, then `/preview.html` for a phone viewport. Run `node --test tests/*.test.mjs`. Optional `tests/browser.mjs` validates the real workbook and full workflow in Chromium. Increment the service-worker cache version whenever changing its cached shell; the next closed/reopened app activates the new cache atomically. Never silently replace a user's personal tasks on timetable import.

Known next work: structured source corrections for time/recurrence/variants; update identity through moved cells; multiple real workbook revisions; durable source/history storage. Do not treat every schema/example in DD-001 as already implemented.
