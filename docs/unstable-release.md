0.4 functional test candidate — **Unstable only**. Stable remains v0.3.2; promotion requires the owner's explicit approval.

- PWA: https://lev-fedotovskii.github.io/Setka/unstable/
- Android: **Setka Unstable**, separately installed as `io.setka.app.unstable`.
- Stable remains v0.3.2 at https://lev-fedotovskii.github.io/Setka/ and remains the default download.
- Local study timer with pause/restart recovery, corrections, fractional progress and subject statistics. Measured time stays separate from plans/estimates.
- Full-screen onboarding and document scroll/gesture locking behind dialogs.
- Minimum recommendation windows and reversible dated/weekly exclusions, independently of occupied time and reminders.
- Subject/deadline/reminder/repeating task controls; moving planned work; personal-event series/occurrence editing and undo.
- Cross-source lesson selection with personal day/date ranges and own-class hiding, reviewable updates and attendance decisions for overlaps.
- Correction history and preserved source baselines; ambiguous recurrence requires explicit input.
- Optional Android now/next status with transition alarms, Stop, quiet hours and reboot handling; native time-selection wheels.
- Separate storage, notification ledger, cache and installation identity. No automatic personal-data transfer. Android automatic cloud backup is disabled; explicit backup/restore remains available.
- Stable MIPT source updates continue every six hours while its application stays pinned.

Published only after API 35/36 emulator release checks pass, including coexistence, Stable-data retention, timer recovery and status reboot checks. Physical testing of these new features is still required; the Samsung S23 channel-coexistence confirmation concerned Unstable.1 only. Without exact alarm permission, status transitions may be delayed; force-stop/battery restrictions can interrupt delivery. No closed-PWA notification promise. A forgotten timer is reviewed when finishing. Inherited 0.3.x corrections need their original workbook reopened if no undo baseline exists.

See [functional decisions, verification and remaining device checks](https://github.com/Lev-Fedotovskii/Setka/blob/main/docs/design/DD-010-functional-04.md). Phys Pastel remains the current appearance; GLIWA and the broader visual work are deferred to 0.5.
