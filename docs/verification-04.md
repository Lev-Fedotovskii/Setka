# 0.4 Unstable functional verification

Candidate application commit: `5996fffc644c8ff97f13ab23ba7631c54946032c`. Stable remains **v0.3.2**. No stable promotion is authorized.

## Completed checks

- **71 domain/import tests:** recurrence/parity/dates, free windows and allocation, corrections, source reconciliation, repeating tasks, personal-event exceptions, timer restart/pause/clock changes/deduplication, fractional progress and measurement/estimate separation, individual-plan updates and conflict attendance.
- **13 browser suites:** real XLS/XLSX imports, all eight supported catalog sources, update review and preservation, notification permissions/deduplication, installability/offline reload, full-screen onboarding and modal locking, study workflow, individual selections, task editing/repetition/moving, Week zoom/printing, and channel isolation. [Passed Pages CI](https://github.com/Lev-Fedotovskii/Setka/actions/runs/34394213768).
- **Mobile Today:** study action beside Today, compact active timer and now/next, one-row date and add controls. First timetable entry visible at 320/360/390 px; active timer controls and landscape overflow checked. Both local Windows/Edge and Linux/Chromium passed. The deployed Unstable URL was tested again with fresh isolated browser profiles.
- **Signed release APK on Android APIs 35 and 36:** separate installation, Stable sentinel preservation, import/export/planning, offline persistence, reminders while backgrounded, signed reinstallation retention, timer suspension/reload/correction, status transitions/Stop, and real emulator reboot restoration. [Passed Android CI](https://github.com/Lev-Fedotovskii/Setka/actions/runs/34394213869).
- Reboot verification reads Android's active notification list before opening or instrumenting Setka again. This avoids changing the state under test. The transition test invokes the receiver after its planned transition; it does not measure alarm precision under manufacturer battery policies.
- Live PWA channel checks confirm Stable metadata **0.3.2**, distinct workers/caches/storage/notification ledgers, and separate personal tasks through offline reload. Same-origin quota, permissions and browser-wide site-data clearing remain shared; see [channel boundaries](release-channels.md).

## Scope and remaining gates

The functional timer/statistics, individual timetable choices, and task/planning work are implemented. [DD-010](design/DD-010-functional-04.md) records the behaviour and the future visual scope: Phys Pastel stays available; GLIWA, font assets and the cohesive 0.5 redesign require the owner's concept.

Physical testing remains open for Android reliability and now/next (#2/#4), including restrictive battery policies and old 0.2 recovery on the tester's Xiaomi. The time-wheel work (#7) still needs device accessibility/font/keyboard validation. Emulator success does not close these gates.

The owner confirmed **Unstable.1** coexistence and Stable-data isolation on a **Samsung S23**; Android version was not supplied. No physical test of the new functional candidate is claimed. Follow the [short device procedure](unstable-device-check.md) and record the actual release/device/results.

All study measurements/statistics remain local. No analytics backend, telemetry SDK, account or automatic estimate rewriting was introduced. Personal data transfers use explicit backup/restore; Android automatic backup/transfer is disabled for this candidate. The stable package/signing/update identity is unchanged. No project licence or font licence was chosen.
