# Typr Threat Model

## Assets

- User keystroke stream (high sensitivity)
- Inferred error profile and drill history
- Local SQLite database at `%LOCALAPPDATA%/typr/typr.db` (Windows)

## Trust boundaries

| Boundary | Trust level |
|----------|-------------|
| Typr capture daemon | Trusted by user after explicit opt-in |
| Other processes on machine | Untrusted — may read DB if disk unencrypted |
| Network | Untrusted — no keystroke data should cross |

## Threats and mitigations

### T1: Credential harvesting

**Risk:** Capture logs passwords in browsers or password managers.

**Mitigations:**

- Default blocklist (1Password, Bitwarden, KeePass, "password", sudo, Terminal)
- User-editable blocklist
- Pause hotkey / tray toggle
- Hashed window titles only (not raw titles in DB)

### T2: Malware classification

**Risk:** Antivirus flags global keyboard hook.

**Mitigations:**

- Code signing (release builds)
- Open-source capture crate
- Clear onboarding consent

### T3: Data exfiltration by Typr

**Risk:** App sends keystrokes to a server.

**Mitigations:**

- No network calls in capture path
- Sentry opt-in excludes keystroke payloads
- Updater fetches binaries only from configured endpoint

### T4: Local attacker with disk access

**Risk:** SQLite file readable offline.

**Mitigations:**

- OS full-disk encryption (user responsibility)
- Export/delete tooling
- Future: optional SQLCipher encryption

### T5: Misuse for surveillance

**Risk:** User installs on another person's machine without consent.

**Mitigations:**

- Terms of service: personal use only
- Visible tray icon when capture is active
- Onboarding requires explicit consent checkbox

## Out of scope (v1)

- Secure enclave storage
- Per-field OS password-field detection on all platforms
- Remote attestation
