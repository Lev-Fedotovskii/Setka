# DD-005 — Sources, classification, notifications and distribution

2026-09-06. Extends the existing baseline; DD-001/DD-002 product invariants remain.

## MIPT source catalog

The official page is an Angular shell. Its rendered content uses public `subdivisions.getItemDetail` and `blockPage.getItemsForPrimaryByPath` requests. The scraper first checks HTML links, then resolves the department ID from the public API and extracts links from its HTML content. No numeric department ID, accordion CSS class or absolute Excel column is hard-coded. API changes fail visibly rather than producing an empty successful catalog.

`scripts/discover-mipt.mjs` finds teaching workbooks by official host/path, meaningful link text, academic year, term and course. It excludes exam/retake lists. Source identity uses program/course/school/year/term, independent of download URL. Each run downloads bytes and records SHA-256, ETag, Last-Modified, size, format, checked time and content-change time. Byte signatures, rather than filename extension alone, distinguish XLSX and legacy XLS.

The observed live catalog exposes eight workbooks: two XLSX and six legacy XLS. XLS sources are tracked but marked unsupported by the current importer. The BVO year-one workbook is downloadable and parsed. Downloaded public workbook copies are published beside a small catalog; a PWA can fetch them from its own origin. Android fetches the same public Pages feed through Capacitor HTTP. Core offline behavior needs neither feed nor backend.

The Pages workflow refreshes every six hours, on main pushes and by manual dispatch. A total discovery/download failure fails deployment, preserving the last working site. Individual failures retain prior source evidence with an error status. App status shows the source's actual MIPT check time, not the time it happened to load a stale manifest. Catalog requests are network-only in the service worker. Update checks compare content hashes, build a candidate for the selected group, show the number of timetable changes and require existing review/apply. Personal state and compatible type corrections survive. Matched lesson IDs survive source-cell moves. Source exclusions are recorded separately.

## Lesson kind evidence

Read actual `styles.xml`, style XF fill IDs and cell fills. In the supplied workbook, nonempty strings include 159 pink `FF99CC`, 476 cyan `CCFFFF`, and 456 pale-yellow `FFFF99` cells; counts include non-lesson content such as sport. The palette is recognized only when all three colors occur in an inferred MIPT sheet. Unknown colors, theme/indexed fills without resolved RGB, and unrecognized palettes remain unknown unless text explicitly identifies the kind.

Observed anchors: C10:K11 and C14:K15 are pink shared lectures; C12:C13 is a cyan seminar. C47:C49 explicitly says laboratory practicum and stays `lab`. Yellow C4:C5 (foreign language) is `practice`; yellow chemistry CK10 has no practicum word and is also `practice`. **Yellow chemistry AH8 explicitly contains `(с)` and is a seminar**. Pink chemistry and cyan chemistry elsewhere demonstrate that a subject name alone cannot decide its kind. Bright blue `00B0F0` exists in the style table but was not observed on a nonempty lesson; it is not assumed to mean seminar.

Precedence: sport / explicit lab / explicit seminar or `(с)` / explicit lecture or `(л)` / explicit practicum → recognized palette fallback → other. Explicit text wins over color and conflicts are retained as warnings. `kindEvidence` and source style preserve the method/profile/color. This is a fixture-backed convention, not a universal or officially verified color legend. Color never affects parity.

## Follow-ups

Defaults live in `domain/followups.js`: lecture 30 minutes, seminar 60, lab/practice 60. All are enabled for new installations; migration preserves existing disabled rules and custom estimates. Catch-up materializes only ended occurrences since the saved cursor. Each task includes an immutable origin snapshot with series/occurrence IDs, subject, kind, date, times and source evidence. The compact origin button opens the lesson's day. The deadline defaults to the next same-subject/same-kind occurrence, or no deadline at term end. Completing/planning generated tasks uses the ordinary task/session path. First import starts prospective generation, avoiding a semester backlog.

## Notifications

`domain/notifications.js` emits deterministic intents separately from platform delivery. It applies quiet hours and user-selected lead times, ignores completed/skipped work, and emits at most one daily follow-up digest. Permissions are requested only by a user action. Upcoming native alarms cover a rolling 30 days (up to 500 intents), refreshed on launch, resume and persisted changes; cancellation/update is keyed by deterministic IDs and full payload signatures.

Android uses the official Capacitor Local Notifications plugin, its AlarmManager-based scheduling and boot restore receiver. It checks notification and exact-alarm permission, schedules approximately when exact timing is unavailable, and offers a settings action for exact alarms. `allowWhileIdle` is enabled. Force-stop, restrictive device power policies and a horizon not refreshed by opening the app remain platform limitations.

The PWA requests Notifications permission and uses service-worker `showNotification` for scheduled page timers. This is explicitly an open-app feature; no reliable closed-app timers or Web Push backend are claimed. Late timers after suspension are discarded to avoid a burst. Tags and a delivered ledger deduplicate alerts. Notification actions return to the corresponding day/tasks.

## Distribution

esbuild bundles the existing modules; Capacitor wraps the same dist directory. Build output uses relative asset URLs, a relative manifest id/start/scope, and a content-fingerprinted service worker with scope-relative navigation fallback. No product demo-task controls are shipped. `preview.html` remains a separate development viewport tool, outside the product navigation.

GitHub Actions tests the `/Setka/` subpath and deploys Pages. A separate Android workflow produces an installable debug APK artifact without committing a signing key. Public release signing can later use a protected private key; it is not needed for an installable development APK. Application state and build/auth/toolchain caches are excluded from Git.
