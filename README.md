# Typr

Personal typing coach that learns from your keystrokes **locally** and builds customized drills to correct your weak spots.

## Features

- System-wide keystroke capture (Rust + `rdev`) with privacy blocklist
- Backspace-correction and practice-mode error inference
- Dashboard with keyboard heatmap, slow bigrams, session trends
- Spaced-repetition drills (SM-2) generated from your error profile
- Export / delete all data — nothing leaves your machine by default

## Stack

| Layer | Technology |
|-------|------------|
| Desktop | Tauri 2 + React + Vite + Tailwind |
| Capture | `typr-capture` (rdev, active-win) |
| Database | SQLite (`typr-db`) |
| Analytics | `typr-analytics` |
| Drills | `drill-engine` (TypeScript SM-2) |

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
├── packages/drill-engine/
└── docs/               # privacy.md, threat-model.md
```

## Privacy

See [docs/privacy.md](docs/privacy.md) and [docs/threat-model.md](docs/threat-model.md).

## License

MIT
