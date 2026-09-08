# Setka / Сетка

Stable **0.3.2** · Development **0.4.0-unstable.1**. A personal university planner for MIPT. **Today comes first:** what is happening now, what comes next, and what fits into your free time.

| Channel | Open PWA | Android download |
| --- | --- | --- |
| **Stable — recommended** | [Setka](https://lev-fedotovskii.github.io/Setka/) | [Latest stable APK](https://github.com/Lev-Fedotovskii/Setka/releases/latest) |
| **Unstable — testing only** | [Setka Unstable](https://lev-fedotovskii.github.io/Setka/unstable/) | [0.4.0-unstable.1 APK](https://github.com/Lev-Fedotovskii/Setka/releases/download/v0.4.0-unstable.1/Setka-0.4.0-unstable.1.apk) |

Unstable installs separately and starts with its own data. It is not the completed 0.4 release. Stable stays on 0.3.2 while official timetable updates continue; promotion requires the owner's explicit approval. See [channel isolation, testing and release procedure](docs/release-channels.md).

0.3.2 fixes repeated mobile Week expansion/collapse, restores the previous normal zoom, fits the expanded timetable to both screen axes and adds continuous slider/two-finger zoom confined to the timetable.

0.3.1 selects every discovered entry on each new import; uncertain records remain conspicuous and incomplete selected entries require correction before applying. It adds expanded/zoomable Week and landscape printing, automatic first-launch welcome, task details and a manually-created filter, aligned compact forms, and restores the actual 0.2.0 launcher artwork. Stable Android updates retain the 0.3.0 package and signing identity. See [patch decisions and verification](docs/design/DD-008-focused-patch.md).

[Open the PWA](https://lev-fedotovskii.github.io/Setka/) · [Download Android APK](https://github.com/Lev-Fedotovskii/Setka/releases/latest) · [Android builds](https://github.com/Lev-Fedotovskii/Setka/actions/workflows/android.yml)

## What it does

- Today timeline and an academic Week grid with true multi-slot lessons.
- Fixed commitments, checkable tasks and scheduled WorkSessions remain separate.
- Explainable recommendations based on deadlines, priority, remaining work and available time.
- MIPT source catalog, automatic content-hash update detection, group selection and explicit review/diff before applying updates. Personal tasks, sessions and compatible corrections survive re-import.
- Lesson classification from explicit text and the observed MIPT workbook palette, with preserved evidence.
- Linked follow-up tasks after lectures, seminars and practical classes, with catch-up and deduplication.
- Offline local persistence, backup/restore and native Android or open-PWA notifications.
- Russian UI; schedule time is explicitly Europe/Moscow, independent of the device timezone.

There is no product LLM, account requirement, backend database or device sync.

## Run and preview

Requires Node.js 22+ and npm.

```sh
npm ci
npm start
```

Open http://localhost:4173. The phone-sized preview is http://localhost:4173/preview.html. `START.cmd` also builds and starts an already-installed Windows checkout.

Choose **Выбрать расписание МФТИ**, select a program/course, then review your group and term before applying. If offline or a source is unavailable, import a local **XLS or XLSX** under **Ещё**. All eight current catalog workbooks are covered, including the dated-week ФБВТ layout. Uncertain source entries remain visible for review.

```sh
npm test
npm run build
npm run sources:refresh
```

The application is served from `dist/`. For subpath testing, set `BASE_PATH=/Setka/` and `PORT=4175` before `node server.mjs`, then open http://localhost:4175/Setka/.

Browser checks require Playwright's Chromium or installed Edge:

```sh
npx playwright install chromium
# BROWSER_CHANNEL=chromium, TEST_URL=http://localhost:4175/Setka/
node tests/browser.mjs
node tests/update-browser.mjs
node tests/notifications-browser.mjs
node tests/installability-browser.mjs
node tests/catalog-browser.mjs
```

On Windows, browser tests default to installed Edge. `TEST_URL` can point to the deployed Pages app. Tests use an isolated browser profile and never modify your normal application data.

## Schedule updates

The GitHub Pages workflow runs on main pushes, every six hours and manually. It discovers official links through HTML or MIPT's public content API, resolves metadata, downloads files and computes SHA-256. The catalog and workbook copies are published with the app so PWA requests do not depend on MIPT allowing browser CORS.

The app checks the feed on launch/resume, reconnect and manual refresh. It displays when MIPT was actually checked. A changed workbook becomes a candidate with a per-group diff; it never replaces your timetable automatically. A failed check remains a failure, not an “up to date” result. Existing local data remains usable offline.

## Lesson kinds and follow-up tasks

In this fixture, pink `FF99CC` supports lecture classification, cyan `CCFFFF` supports seminar, and pale yellow `FFFF99` supports practical classes. Explicit text wins. Yellow chemistry with `(с)` is a seminar; yellow chemistry without an explicit marker can be practical. Yellow language/programming classes are ordinary classes, with no homework implied by color. Sport overrides color. Unknown palettes or unresolved evidence stay generic. Color never determines parity.

Default tasks are “Разобрать материал лекции”, “Сделать ДЗ” and “Оформить практикум”, estimated at 30/60/60 minutes. Each carries an occurrence ID and a compact lesson date/time reference. They appear after lesson completion or the next launch, remain unscheduled until planned, and are generated once. The deadline defaults to the next same-subject/same-kind class when one exists. Rules and estimates are configurable, including an opt-in ordinary-class rule. Welcome setup includes these preferences; an explicit seven-day review can add up to 30 previous tasks without duplicates. Existing users' disabled rules and custom estimates are preserved during migration.

## Notifications

Enable notifications explicitly in **Ещё**. Configure lesson/session lead times, a single daily follow-up digest and quiet hours.

- **Android:** native local scheduling for a rolling 30-day horizon, refreshed when you open/resume the app or change plans. Alarms work without the UI running. Exact timing requires Android's “Alarms & reminders” permission; otherwise timing is approximate. The plugin restores scheduled notifications after reboot. Force-stop and restrictive device battery settings can interrupt delivery; reopen the app afterwards.
- **PWA:** browser Notifications plus service-worker display, driven by timers while the app is open. No reliable closed-PWA reminders are claimed. There is no Web Push server. iPhone permission availability depends on the installed Home Screen web app and OS/browser support.

See [Capacitor's notification documentation](https://capacitorjs.com/docs/apis/local-notifications) for platform constraints.

## Android APK

The Android workflow publishes a **stable signed release APK**. See [release and migration instructions](docs/android-release.md).

**Android 0.2.0 users: the stable edition installs alongside the old app, preserving its data.** The old CI debug signing key was not retained; this is not an in-place update. Keep the old app until you have verified a complete backup/restore. If the old export fails, do not uninstall it; the migration guide includes computer-assisted recovery. Future stable updates retain one protected signing key and package identity.

Local builds require Java 21 and Android SDK 36. Run `npm ci`, `npm run build`, `npx cap sync android`, then `android/gradlew -p android assembleDebug` for a development build. Stable release builds require the protected signing environment described in the guide. Keys never belong in Git.

## Architecture and development notes

- `src/domain/`: dates, recurrence, allocation, follow-ups, notification policy.
- `src/import/`: XLSX → workbook IR → MIPT inference → canonical candidates with provenance.
- `src/sources.js` and `scripts/discover-mipt.mjs`: feed acquisition, identities, update checks.
- `src/platform/`: browser/native notification adapters.
- `src/storage.js`: versioned local state and validation/migration.
- `scripts/build.mjs`: shared web/native distribution with relative paths and content-versioned cache.
- `android/`: Capacitor wrapper; the UI remains the same application.

Read `docs/design/` before changing import semantics. The original fixture is unchanged. The sample JSON is partial and contains a stale room: the workbook says 515 ГК at C12:C13, whereas the sample says 230 ГК. DD-003 was not present in the supplied materials; DD-004/DD-005 describe the implemented decisions and limits.

Known limits: complex mixed-parity cell splitting, arbitrary workbook layouts beyond those documented, advanced source matching, multi-device sync, ICS and dependable closed-PWA push. Semester dates remain reviewable. The ФБВТ workbook contains a conflicting date and an intensive with no stated time; these entries are withheld and shown in review. LocalStorage has browser/device storage limits; export backups before clearing application data.

Alpha improvements include editable imported entries/variants, hidden lessons, task editing and completion reversal, weekly personal blocks, clearer date navigation, mobile Week jumps, native safe areas and Android file export. See [DD-007](docs/design/DD-007-alpha-feedback.md) for decisions and deferred scope.
