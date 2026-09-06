# DD-006 — Legacy XLS and dated timetable layouts

Validated against all eight workbooks in the official MIPT catalog on 6 September 2026. The six legacy XLS files are preserved under `fixtures/mipt/xls/`, with source URLs and content hashes in `cases.json`.

The existing XLSX reader remains unchanged. A signature-based workbook entry point adds SheetJS 0.20.3 for binary XLS, preserving Unicode text, saved formulas, merged ranges and fill colors in the same workbook IR. Both readers are offline and execute neither macros nor formulas.

## Observed layouts

| Workbook | Groups / streams | Inferred records before review |
|---|---:|---:|
| BVO year 1, XLSX | 86 | Original fixture: 1080 |
| Bachelor year 2, XLS | 79 | 1139 |
| Bachelor year 3, XLSX | Multiple horizontal blocks | Checked through catalog UI |
| Bachelor/specialist year 4, XLS | 65 | 414 |
| SpVO year 1 / specialist year 5, XLS | 57 | 282 |
| Master year 2, ФАКТ, XLS | 1 | 11 |
| Master year 2, ФПМИ, XLS | 12 | 6 |
| Master year 2, ФБВТ, XLS | One unnamed common stream | 66 |

Counts include records needing selection or clarification. Sparse master schedules are not padded with invented lessons. “Базовый день” remains a generic fixed commitment with no academic follow-up rule.

Standard horizontal timetables use the same parser and preserve each block's own day/time columns. The most frequent actual time-column sequence supplies the workbook bell schedule. ФАКТ, for example, has its second slot at 10:45–12:10 rather than the BVO fixture's 10:35–12:00.

Pink and cyan support lecture/seminar detection in these standard tables even if a small workbook has no yellow cells. Yellow retains the practical fallback. Explicit text still wins and unknown evidence stays generic.

## ФБВТ dated-week adapter

This workbook puts weeks in columns and explicit days of the month above the weekday blocks. Its colors distinguish subjects and activities, so the standard lesson-color classifier is deliberately disabled. Explicit seminar text can still identify a seminar.

The adapter reads the printed month range, validates the day number against the weekday and expands each occupied cell into a concrete date. `recurrence.datesOnly` prevents it from becoming a weekly event when the reviewed term is changed. There are no printed group numbers: the UI explicitly presents a common ФБВТ stream. Multiline locations and an explicit “с 19:00” override are preserved.

Four source records are withheld and shown in review: generic exam/holiday markers, a conflicting date at L40:L41, and the Sunday intensive at E50 without stated times. Missing or conflicting details are not invented. The printed January class extends the proposed semester end into January.

## Product presentation

The blue application palette remains. Block colors are independent of workbook inference: lecture rose, seminar blue, practical/lab amber, sport cyan, WorkSession lavender, personal commitment peach, unknown neutral. Every block also has a textual label.

Verification includes real binary-file regression tests, all eight catalog imports in the browser, a same-length BIFF string edit to exercise a changed XLS source, review/apply with personal-data preservation, and native Android XLS acquisition.
