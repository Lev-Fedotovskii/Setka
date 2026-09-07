# Android release and data transition

## Users of the public 0.2.0 APK

**0.3.0 installs alongside 0.2.0. It does not replace or erase the old app.** The public 0.2.0 APK used a temporary CI development key that was not retained. The available local development key has a different certificate. Android therefore cannot accept a normally signed update to that installation.

The stable edition uses `io.setka.app.release`; the old edition uses `io.setka.app`. Keep the old app installed until your timetable, personal tasks, sessions and settings have been checked in the new one. Do not uninstall it merely to resolve an installation error.

1. In the old app, try **Ещё → Скачать резервную копию**. A complete backup is `setka-backup.json`; a timetable-only export does not include personal tasks.
2. In the stable app, choose **Ещё → Восстановить копию**, select that file and review the confirmation.
3. Check your tasks, planned sessions, settings and manual timetable changes. Export a new backup using the fixed Android system file picker.
4. Only after verifying the transfer may you choose to remove the old installation. Keeping both is safe; their storage is separate.

**If export is broken in 0.2.0, keep that app.** A computer-assisted recovery is possible because that published APK is debuggable: connect your own phone to a trusted computer with USB debugging authorized, open Chrome's `chrome://inspect/#devices`, inspect the old Setka WebView, run `copy(localStorage.getItem('setka.v1'))` in its DevTools console, and save the copied text locally as UTF-8 `setka-backup.json`. Restore it as above. Never paste this personal backup into a public issue. Disable USB debugging afterwards if you do not use it. This recovery requires physical access and has not been verified on the tester's Xiaomi.

The PWA keeps its existing URL and storage; this Android package transition does not affect PWA data.

## Maintainers

The stable key was created on 7 September 2026. Private material is excluded from Git, kept in a Windows-account-restricted local directory, and stored in encrypted repository Actions secrets:

- `SETKA_KEYSTORE_BASE64`
- `SETKA_STORE_PASSWORD`
- `SETKA_KEY_PASSWORD`
- `SETKA_KEY_ALIAS`

The local recovery copy is in the ignored `.local/signing/` directory. The owner should keep a separate encrypted offline backup of this directory: GitHub secrets cannot be read back. Do not regenerate the key for routine releases. Do not publish local directories, keys, passwords, APK tool caches or personal backups.

CI restores the keystore into a restrictive temporary file, signs `assembleRelease`, uploads only the APK, and removes temporary signing material. A release build refuses to package without explicit signing configuration. Local builds use the same four environment variables, with `SETKA_KEYSTORE_PATH` replacing the base64 secret.

Future releases must preserve `io.setka.app.release`, the stable certificate, and monotonically increasing `versionCode`. Install with Android's ordinary update flow; do not uninstall/clear data. Development builds remain separate and are not published as the stable APK.

Public 0.2.0 certificate SHA-256: `dadef6eab3cc8b24b5b52522ee5d875ff02d9a4e4fa64abfc809c0546a6bd2ab`.

Stable certificate SHA-256: `26d1e4e82592027d246fd7c7438ccd6009c293ad5dad6b573512ae9fdf88b99a`. CI checks it before accepting an APK.

Android's [update identity rules](https://developer.android.com/google/play/app-updates) require a matching package/signature. Signing does not guarantee that [Play Protect](https://support.google.com/googleplay/answer/2812853) warnings disappear; no bypass is provided.

## Required device checklist

Record device model, Android version and APK hash. Check portrait/landscape cutouts, gestures and three-button navigation, keyboard/dialog clearance, system JSON saving and restore, offline XLS/XLSX import, stable-key update retention, notification permission denial/grant, lead-time changes, quiet hours, background delivery, reboot restoration, exact-alarm permission changes and force-stop/reopen. CI emulator evidence does not replace physical Xiaomi/battery-policy evidence.
