# Setka / Сетка

A personal university planner for MIPT. **Today comes first:** what is happening now, what comes next, and what fits into your free time.

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

In this fixture, pink `FF99CC` supports lecture classification, cyan `CCFFFF` supports seminar, and pale yellow `FFFF99` supports practical classes. Explicit text wins. Yellow chemistry with `(с)` is a seminar; yellow chemistry without an explicit marker can be practical. Sport overrides color. Unknown palettes or unresolved evidence stay generic. Color never determines parity.

Default tasks are “Разобрать материал лекции”, “Сделать ДЗ” and “Оформить практикум”, estimated at 30/60/60 minutes. Each carries an occurrence ID and a compact lesson date/time reference. They appear after lesson completion or the next launch, remain unscheduled until planned, and are generated once. The deadline defaults to the next same-subject/same-kind class when one exists. Rules and estimates are configurable. Existing users' disabled rules and custom estimates are preserved during migration.

## Notifications

Enable notifications explicitly in **Ещё**. Configure lesson/session lead times, a single daily follow-up digest and quiet hours.

- **Android:** native local scheduling for a rolling 30-day horizon, refreshed when you open/resume the app or change plans. Alarms work without the UI running. Exact timing requires Android's “Alarms & reminders” permission; otherwise timing is approximate. The plugin restores scheduled notifications after reboot. Force-stop and restrictive device battery settings can interrupt delivery; reopen the app afterwards.
- **PWA:** browser Notifications plus service-worker display, driven by timers while the app is open. No reliable closed-PWA reminders are claimed. There is no Web Push server. iPhone permission availability depends on the installed Home Screen web app and OS/browser support.

See [Capacitor's notification documentation](https://capacitorjs.com/docs/apis/local-notifications) for platform constraints.

## Android APK

The Android workflow publishes **Setka-Android-APK** artifacts. Download the artifact from a successful run and install `app-debug.apk`, allowing installation from that download source when Android asks.

For a local build, install Java 21 and Android SDK 36, set `JAVA_HOME` and `ANDROID_HOME`, then:

```sh
npm ci
npm run build
npx cap sync android
cd android
# Windows: gradlew.bat assembleDebug
./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`. These are installable development-signed APKs, not Play Store releases. Keys are excluded from Git. Separate CI runs can use different development keys, so export a backup before reinstalling an APK from another signing source. A stable published release APK is provided separately when available.

## Architecture and development notes

- `src/domain/`: dates, recurrence, allocation, follow-ups, notification policy.
- `src/import/`: XLSX → workbook IR → MIPT inference → canonical candidates with provenance.
- `src/sources.js` and `scripts/discover-mipt.mjs`: feed acquisition, identities, update checks.
- `src/platform/`: browser/native notification adapters.
- `src/storage.js`: versioned local state and validation/migration.
- `scripts/build.mjs`: shared web/native distribution with relative paths and content-versioned cache.
- `android/`: Capacitor wrapper; the UI remains the same application.

Read `docs/design/` before changing import semantics. The original fixture is unchanged. The sample JSON is partial and contains a stale room: the workbook says 515 ГК at C12:C13, whereas the sample says 230 ГК. DD-003 was not present in the supplied materials; DD-004/DD-005 describe the implemented decisions and limits.

Known limits: complex mixed-parity cell splitting, arbitrary workbook layouts beyond those documented, source exception editing, multi-device sync, ICS and dependable closed-PWA push. Semester dates remain reviewable. The ФБВТ workbook contains a conflicting date and an intensive with no stated time; these entries are withheld and shown in review. LocalStorage has browser/device storage limits; export backups before clearing application data.
