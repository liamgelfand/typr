# Typr

Personal typing coach that learns from your keystrokes **locally** and builds customized drills to correct your weak spots.

## Features

- **Native desktop app** (Tauri) — download an installer, no browser or server involved
- System-wide keystroke capture (Rust + `rdev`) that **starts automatically** with a privacy blocklist; pause/disable anytime
- Passive backspace-correction inference *and* keybr-style practice that validates **every keystroke** (a wrong key is counted immediately and can't be "deleted away")
- Practice and drills **auto-grade and auto-advance** — no submit button, no self-rating
- Dashboard with keyboard heatmap, slow bigrams, and session trends
- Spaced-repetition drills (SM-2) generated and scheduled automatically from your error profile
- Export / delete all data — nothing leaves your machine

## Stack

| Layer | Technology |
|-------|------------|
| Desktop | Tauri 2 + React + Vite + Tailwind |
| Capture | `typr-capture` (rdev, active-win) |
| Database | SQLite (`typr-db`) |
| Analytics | `typr-analytics` |
| Drills | SM-2 spaced repetition (in the desktop app, `src/drill-engine.ts`) |

## Install (end users)

Typr is a **native desktop application**, not a web app — there is no localhost
or server to run. Grab the installer for your platform from the
[Releases](../../releases) page:

| Platform | Artifact |
|----------|----------|
| Windows | `.msi` / `.exe` |
| macOS | `.dmg` (Apple Silicon & Intel) |
| Linux | `.AppImage` / `.deb` |

Releases are built automatically by `.github/workflows/release.yml` whenever a
`v*` tag is pushed. (The `http://localhost:1420` URL you may see only exists
while *developing* — it's the Vite dev server that Tauri loads into the native
window. Production builds bundle the UI directly into the app.)

## Development (WSL Ubuntu — recommended)

The canonical dev environment is **WSL2** with the repo at `~/projects/typr` (Linux filesystem, not `/mnt/c`).

See **[docs/wsl-development.md](docs/wsl-development.md)** for the full guide.

```bash
# One-time (in an interactive WSL terminal — sudo will prompt for password):
cd ~/projects/typr
./scripts/setup-wsl.sh

# Daily:
cd ~/projects/typr/apps/desktop
npm run tauri dev
```

Open in Cursor: `\\wsl$\Ubuntu\home\<user>\projects\typr` (Remote - WSL).

### Windows-native (optional)

Requires [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (C++ workload) for the MSVC linker. WSL is preferred if you want to avoid VS.

### Build

```bash
cd apps/desktop
npm run tauri build
```

## Project structure

```
typr/
├── apps/desktop/       # Tauri + React UI
├── crates/
│   ├── typr-capture/   # Global keyboard listener
│   ├── typr-db/        # SQLite schema & queries
│   └── typr-analytics/ # Error inference & rollups
└── docs/               # privacy.md, threat-model.md
```

## Privacy

See [docs/privacy.md](docs/privacy.md) and [docs/threat-model.md](docs/threat-model.md).

## License

MIT
