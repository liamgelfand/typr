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

## Updater (in-app auto-update)

Typr ships in-app auto-update via `tauri-plugin-updater`. The app checks
GitHub Releases on launch, and if a newer **signed** build exists it offers
"Install & restart" in a toast (see `src/components/UpdateNotice.tsx`).

### How it's wired

- `bundle.createUpdaterArtifacts: true` and a `plugins.updater` block (with the
  public key + endpoint) live in `apps/desktop/src-tauri/tauri.conf.json`.
- Endpoint: `https://github.com/liamgelfand/typr/releases/latest/download/latest.json`
  (GitHub's `/releases/latest/` only resolves to a **published**, non-draft
  release — see below).
- `.github/workflows/release.yml` passes `TAURI_SIGNING_PRIVATE_KEY` to
  `tauri-action`, which signs the bundles and uploads `latest.json`.

### One-time setup (signing keys)

1. A keypair was generated with `npm run tauri signer generate` (minisign).
   The **public** key is embedded in `tauri.conf.json`. The **private** key is
   at `~/.tauri/typr-updater.key` — keep it safe and never commit it. **If you
   lose it, existing installs can never be updated again.**
2. In GitHub: **Settings → Secrets and variables → Actions → New repository
   secret**:
   - `TAURI_SIGNING_PRIVATE_KEY` = the full contents of `~/.tauri/typr-updater.key`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — **skip this**. Our key has no
     password, and GitHub rejects empty secret values. The workflow reference
     resolves to an empty string when the secret is absent, which is correct
     for a no-password key. (Only create it if you later regenerate the key
     *with* a password.)

### Cutting an update that users actually receive

1. Bump `version` in `apps/desktop/src-tauri/tauri.conf.json` **and**
   `apps/desktop/package.json` (the updater only triggers when the released
   version is newer than the installed one).
2. Commit, then push a matching tag: `git tag v0.2.0 && git push origin v0.2.0`.
3. The release workflow builds + signs installers and `latest.json`, then
   creates a **draft** release.
4. **Publish the draft release** (Releases page → Edit → Publish). Until it's
   published, `/releases/latest/` won't see it and clients won't update.

Once published, every running copy of the older version will show the update
toast on next launch.

## Sentry (opt-in)

Set `VITE_SENTRY_DSN` only when user enables crash reports in Settings. Never attach keystroke or DB payloads.
