# DD-007 — Alpha feedback release

2026-09-07. Extends the existing Today-first, local-only planner. No licence decision, telemetry, account or backend was added.

## Correctness and personal corrections

Room tails are recognized before comma-separated metadata, so `Основы общей и неорганической химии-210, 211 БК` yields the complete room and a clean subject. Both instructor initial orders are accepted; the details and Week cards display the already-parsed metadata. Names absent from the workbook remain absent.

Explicit lesson text still precedes the observed palette. Yellow foreign-language, English, programming and informatics classes use `class` (ordinary class), not a practical-report implication. Unknown remains `other` and cannot generate academic tasks even through a custom rule. The palette still never determines parity. Existing imports receive this narrow metadata fix on migration, keeping IDs and personal data; matching manual corrections take precedence.

Review includes a full title/type/time/weekday/parity/date/room/instructor editor. Users can create a second explicit variant and resolve a withheld dated entry by supplying missing fields. Every replacement retains the original source text, sheet and range. Corrections live in the existing override layer and apply only to matching raw evidence. Changed evidence requires review again. Complex arbitrary cell decomposition and matching through simultaneous cell moves/text changes remain outside this release.

All unambiguous records default on. Footnote stars alone no longer opt a record out. Actual subgroup alternatives, parallel columns and blocked records still require a choice. Existing exclusions remain respected.

Students can hide/restore lessons. Compatible hide/correction choices survive reimport. Importing one lecture from another group while maintaining multiple independent update sources remains deferred pending the tester's requirements.

## Setup, tasks and mobile use

An optional welcome entry leads to source/file selection, review and a compact preferences screen. Post-lesson rules, estimates, planning bounds and explicit notification permission are included. A separate opt-in review lists at most 30 tasks from the preceding seven days, using the permanent deduplication ledger. It does not rewind the normal generation cursor. Custom rules can cover known lesson types, including ordinary classes; one exact-type rule supersedes a broader default rule.

Tasks can be edited, annotated, assigned quick deadline dates and separately scheduled. Completion can be reversed from Completed; obsolete time reservations stay skipped to avoid resurrecting conflicts. Estimates remain editable approximations. Personal fixed events can repeat weekly through an explicit end date, independently of university series and work sessions.

Today has relative headings, an explicit return-to-today action, countdowns and visible actions beside the timeline. At the user's request, the top-bar task button is removed. Mobile Week keeps pair rows, gives lessons wider readable columns and adds weekday jump buttons. Bottom navigation is more compact. The existing SVG replaces the header's table glyph and supplies native icon paths; this is not a new visual identity. Major aesthetic changes await the user's visual concept.

## Native boundaries

The Android root applies system-bar, cutout and keyboard insets before WebView layout. Browser safe areas remain CSS-controlled. JSON exports use Android's Storage Access Framework document picker without broad storage permission. Browser exports use file sharing when supported, otherwise a retained download link.

The adaptive foreground derives from the existing SVG and fits its safe zone; the launcher chooses the outer mask. Notifications use a monochrome version of the same grid mark, as required by Android. Notification policy remains native local scheduling/open-PWA delivery with lead times and quiet hours. A persistent status notification needs a separately tested lifecycle/background design and is deferred.

## Distribution and limits

See [Android release/migration](../android-release.md). The v0.2.0 CI debug key was not retained; the available local debug certificate does not match it. A new stable release package is installed alongside it so the old application's data is not erased. This is an explicit transition, not an in-place v0.2 update. Future stable APKs must retain the protected stable key and package ID.

Local Windows compilation succeeds, but the available machine lacks emulator acceleration. Android instrumentation runs in CI; a physical Xiaomi test, reboot/battery-policy checks and Android 16 validation must be recorded separately. A release signature is not a promise about Play Protect.
