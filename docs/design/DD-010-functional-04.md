# DD-010 — 0.4 functional candidate, Unstable only

2026-09-08. Stable remains 0.3.2. Promotion requires the owner's explicit approval, independent of test results. The existing appearance is **Phys Pastel**. GLIWA, font/reference assets, aesthetic redesign, richer animations and optional haptics belong to 0.5; no font or licence decision was made.

## Onboarding and interaction

The first-run flow fills the available viewport, hides the application underneath, and keeps the same full-screen structure through catalog/import/review/preferences. It uses the native dialog's keyboard/focus/Escape semantics. Closing permits skipping setup. Ordinary dialogs freeze the actual document position, restore scroll on dismissal, contain scroll chaining, and block gestures outside the dialog and page pinch/Control-wheel zoom while open. Dialog contents remain scrollable and keyboard editable. Existing Week pinch/zoom/print behaviour remains independent.

## Recommendations and study rhythm

Free time and recommended study time are different. Users set a minimum recommendation duration and exclude a dated interval or the same weekday/time each week, including from a free-window card. Exclusions split recommendation windows; they do not become busy intervals, cancel reminders or erase tasks/plans. Manual planning in an excluded interval remains possible. Exclusions can be undone in More.

The default planner prioritizes deadlines. An optional balanced preference adds a small, explained preference for subjects with less measured study time over seven days. It does not change task estimates, manufacture progress, impose quotas or create streaks. Custom rhythm is expressed through existing day bounds, personal events and recommendation exclusions; no separate complex plan is required.

## Study records (#3)

`measurements` and `activeStudy` are separate from tasks and planned `sessions`. Starting from a task/recommendation uses the known task/subject. Today also supports spontaneous subject-based study with no task and no fixed interval. The timer persists a start timestamp, accumulated active milliseconds and pause state; the UI clock never drives elapsed-time arithmetic. Suspension/restart includes elapsed wall time, excluding explicit pauses. Detected clock jumps are flagged, backward time cannot produce negative durations, and completion is idempotent by measurement ID. Restart recovery is visible. Long/accidental timing is reviewed and editable before saving; saved records can be corrected, corrections undone, or records deleted. An optional fractional quantity, user-defined unit and note records actual progress; weekly homework is not assumed.

Statistics compare seven/thirty-day totals with the preceding period, group by subject, show quantities in their original units, and count newly recorded task completions. Historical tasks without a completion date are not assigned invented dates. Three or more positive measurements with the same subject/unit can yield a transparent minutes-per-unit suggestion showing sample count, total time and progress. Nothing automatically rewrites estimates. Pomodoro cycles are not required for the open-ended workflow and are not included in this candidate.

All measurements remain local. Backups preserve them and active timers. No analytics SDK, telemetry endpoint, account, cloud synchronization or automatic upload was introduced. Android auto/cloud backup and automatic transfer are excluded; the explicit file export/restore remains the transfer mechanism. Browser/OS tools outside the app remain under the user's control.

## Corrections (#1)

Blocked/unresolved entries require an explicit recurrence choice. Dates supplied by the user determine their actual weekday. Field edits preserve multi-date recurrence and exclusions when the recurrence mode is unchanged. A correction history restores the preceding source-backed series/override without deleting personal tasks, measurements or sessions. New source imports also retain the unmodified source baseline, allowing reversal after reimport. A correction inherited from 0.3.x without a stored baseline requires reopening its original workbook before reversal; Setka does not reconstruct unknown historical fields from guesses. Source text/ranges and occurrence IDs remain intact. A changed source cannot be replaced by an incompatible old history snapshot.

## Individual choices (#5)

Search downloads supported official workbooks and searches them locally by subject/type/group. Only selected series are stored in `academicSources`; personal date/day/subject choices and own-series exclusions live in `personalSelections`. A user can select multiple series, an entire semester, a shorter interval or particular dates, and can rename subject grouping without changing official text. Own-group hiding is explicitly selected by series, limited to the personal selection's active dates. Disabling a choice restores own lessons. Overlapping events remain visible and occupy time; equivalent selected occurrences are deduplicated. External-source updates retain selection IDs/ranges and show diffs before applying. Missing or newly blocked series retain the last known record with a warning. Launch/resume/reconnect and periodic checks cover selected sources.

Follow-ups resolve the personal timetable. Overlapping academic lessons with an enabled rule wait for explicit attendance choices instead of assuming all were attended. Choosing none is valid. Tasks already created retain their provenance and are not deleted when attendance choices or sources change. Odd/even template views describe the original group; date-based Week and Today resolve personal selections.

## Tasks and personal recurrence (#6, #7)

Task entry keeps a default estimate and adds an optional subject, deadline time, reminder lead and repetition. Repetition creates one next future task after completing the current one, following daily/weekly/monthly dates; missed repeats do not accumulate a backlog. The form explains this policy. Monthly end-of-month rhythms retain the anchor day. Completion reversal/recompletion does not duplicate the next task. Planned work can move/change duration while retaining its ID and allocation constraints; failed edits roll back. Reminder scheduling observes global permission and quiet hours.

Weekly personal events support series edits, per-occurrence time/date changes and cancellations. Exceptions stay separate from the base recurrence, including moved occurrences. More lists reversible cancellations/exceptions. Time fields remain keyboard editable. Android offers an explicit native NumberPicker wheel control; browser buttons use the browser's own time picker/fallback and do not claim an identical wheel on every browser.

## Optional native status (#4)

The separately optional now/next status uses a finite local transition plan and a dedicated low-noise channel. A BroadcastReceiver updates the notification at transitions and restores alarms after reboot/package update/time changes. No foreground service type or continuous polling is used. Quiet hours/day bounds suppress unhelpful status. Stop or dismissal persists until explicit re-enable; ordinary app synchronization respects that choice. The notification expires after the 30-day saved plan if the app is never reopened. The displayed date is the actual Moscow day, not a browsed calendar date.

Exact alarms require platform permission; without it transitions may be delayed. Force-stop and device battery restrictions can interrupt delivery and require reopening the app. No dependable closed-PWA status is claimed. Platform basis: [Android alarms](https://developer.android.com/develop/background-work/services/alarms), [Android 14 dismissible ongoing notifications](https://developer.android.com/about/versions/14/behavior-changes-all).

## Verification and remaining device work

Domain tests cover migration, recurrence/month ends, timer pause/restart/backward clocks/deduplication, fractional progress and estimate separation, recommendation exclusions, personal exceptions, cross-source changes/missing records, conflict attendance, and notification/status policy. Browser suites exercise the real workbooks, updates, mobile setup/scroll lock, timer correction, task recurrence/moving, personal exceptions, cross-source selection and undo, Week zoom and one-page printing. Release CI adds native timer suspension/reload, status stop/transition checks and actual emulator reboot restoration on APIs 35/36. Check the linked release's CI outcome before treating those new device gates as passed.

Owner confirmed Unstable.1 channel coexistence on Samsung S23; OS version was not supplied. That is not a test of Unstable.2 features. Required physical follow-up: timer background/restart, status transitions while locked, stop/reopen, reboot, permission revocation and battery-policy restrictions; old 0.2 recovery remains unverified on the tester's Xiaomi. Do not close #2/#4 on emulator evidence alone. No additional physical testing is claimed.
