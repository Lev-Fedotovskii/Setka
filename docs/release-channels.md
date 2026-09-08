# Stable and Unstable

Stable remains **v0.3.2**, approved commit `2bd0b444ab1dc6c0e3abd244b29a68dc338d0593`.

| Channel | PWA | Android |
| --- | --- | --- |
| Stable (default) | https://lev-fedotovskii.github.io/Setka/ | `io.setka.app.release`, existing certificate |
| Unstable (development) | https://lev-fedotovskii.github.io/Setka/unstable/ | `io.setka.app.unstable`, label **Setka Unstable** |

`main` is development. Use short-lived `codex/` branches and ordinary merges, without history rewrites. Pages checks out the approved Stable commit separately, installs its locked dependencies, refreshes MIPT data using its source updater, and builds its application. The same official data is copied to the development build. Only one combined artifact can deploy, serialized through `pages-channels`; feature-branch dispatches and PRs cannot deploy. No application code from main is copied into Stable. The six-hour feed refresh continues. A failing deployment retains the previously deployed site.

The only patch to the frozen service worker is a hosting boundary that ignores `/unstable/` requests. Stable's application bundle is asserted byte-for-byte equal to its independent build. Manifest identity/start URL/scope and service-worker scope are relative to each channel. Unstable uses `setkaUnstable-` caches, deliberately outside even old Stable workers' `setka-` cleanup. Unstable cache lookup and cleanup are restricted to its own cache. Data uses `setka.unstable.v1` and `setka.unstable.notifications.delivered`; Stable's `setka.v1` and notification ledger remain unchanged. Build identity is never taken from imported backups or inferred from paths.

These paths share a browser origin: storage quota, site permissions and the browser's **clear all site data** operation are shared. Namespaced application storage and worker/cache boundaries prevent accidental application interference; this is not a security boundary against hostile same-origin code. No channel reads, migrates, clears or automatically copies the other's personal data.

To copy data deliberately: export a full backup in Stable, open **Unstable**, and use its restore file picker and confirmation. This replaces only Unstable's data. Keep a backup of any existing Unstable work first. Going back does not require restoring anything into Stable. Backups containing newer features must not be restored into older Stable blindly.

Android uses separate package IDs, OS data sandboxes and FileProvider authorities. The protected existing certificate signs both packages; the Stable ID/certificate/update path is unchanged. No key is generated. Main's build defaults to Unstable, and a pre-release version is refused when explicitly built as Stable. Version codes increase monotonically. To release an experiment, set `package.json`/lock and Android versionCode, update `docs/unstable-release.md`, then tag `v0.4.0-unstable.N`. Android CI requires the tag to match the package version, runs API 35/36 tests, and publishes with `--prerelease --latest=false` only after both pass. Main pushes produce CI APK artifacts, not stable releases. The public `/releases/latest` must remain v0.3.2.

**Promotion requires the owner's explicit approval.** Passing tests or finishing 0.4 is not approval. Promotion is a separate reviewed change to the pinned commit, release version and stable build/publishing workflow. No automatic promotion job exists.

## Verification

`tests/channels-browser.mjs` opens both PWAs in the same isolated browser context, creates distinct personal tasks through the UI, checks storage and manifest identities, simulates legacy Stable cache cleanup, verifies offline navigation and persistence, and checks that neither worker removes the other's cache. Android CI installs the published Stable APK, seeds its task through the UI, installs Unstable alongside it, checks its identity and fresh data, exercises planning/export/background notifications, reinstalls Unstable, then verifies Stable's sentinel again. CI is emulator evidence, not physical-device testing.

Physical check: install the Unstable APK **without uninstalling Stable**; confirm two launcher entries, open Stable and check existing tasks, open Unstable and confirm fresh setup, create a test task, then reopen Stable and confirm it is absent. If desired, explicitly restore a Stable backup into Unstable. Record phone/OS/build and results. No reset or data deletion is needed.
