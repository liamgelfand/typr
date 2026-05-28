# Code signing & releases

## Windows (Authenticode)

1. Obtain a code signing certificate (EV recommended for SmartScreen reputation).
2. Sign the MSI/exe after `npm run tauri build`:

```powershell
signtool sign /fd SHA256 /a "path\to\typr-setup.exe"
```

3. Set `TAURI_SIGNING_PRIVATE_KEY` for automated CI signing (Tauri docs).

## macOS (notarization)

1. Enroll in Apple Developer Program.
2. Configure `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` in CI secrets.
3. Run `npm run tauri build` — notarize via `tauri signer` / Xcode altool.

## Updater

- Configure real minisign keys: `npm run tauri signer generate`
- Replace the placeholder `pubkey` in `apps/desktop/src-tauri/tauri.conf.json`
- Host update JSON at `https://releases.typr.app/...` per Tauri updater format

## Sentry (opt-in)

Set `VITE_SENTRY_DSN` only when user enables crash reports in Settings. Never attach keystroke or DB payloads.
