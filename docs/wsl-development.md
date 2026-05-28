# Developing Typr in WSL (recommended)

Use the Linux-native copy under `~/projects/typr` for fast builds and the standard gcc toolchain (no Visual Studio).

## One-time setup

```bash
# From Windows, copy into WSL home (once):
mkdir -p ~/projects
rsync -a --exclude target --exclude node_modules \
  /mnt/c/Users/gelfa/OneDrive/ComputerScience/typr/ \
  ~/projects/typr/

# Run the setup script:
cd ~/projects/typr
chmod +x scripts/setup-wsl.sh
./scripts/setup-wsl.sh
```

## Daily workflow

```bash
cd ~/projects/typr/apps/desktop
npm run tauri dev
```

## Open in Cursor / VS Code

Use **Remote - WSL** and open:

```
\\wsl$\Ubuntu\home\<your-user>\projects\typr
```

or from a WSL terminal:

```bash
cursor ~/projects/typr
```

Edit in WSL; do not rely on the OneDrive copy for builds.

## GUI on Windows

Windows 11 WSLg shows Linux GUI apps automatically. If the window does not appear, ensure WSL2 and WSLg are enabled.

## Syncing back to OneDrive (optional)

Use git as the source of truth. Push from WSL; pull on other machines. Avoid editing the same tree in both `/mnt/c/...` and `~/projects/typr` at once.

## Production builds

```bash
cd ~/projects/typr/apps/desktop
npm run tauri build
```

Artifacts: `src-tauri/target/release/bundle/`
