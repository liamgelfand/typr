#!/usr/bin/env bash
# One-time WSL/Ubuntu setup for Typr development.
set -euo pipefail

echo "==> Installing system dependencies..."
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  build-essential \
  curl \
  pkg-config \
  libssl-dev \
  libx11-dev \
  libxcb1-dev \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

if ! command -v rustc &>/dev/null; then
  echo "==> Installing Rust..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
fi

if ! command -v node &>/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  echo "==> Installing Node.js 22 via nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
  nvm install 22
  nvm use 22
fi

PROJECT_DIR="${1:-$HOME/projects/typr}"
if [[ ! -d "$PROJECT_DIR" ]]; then
  echo "Project not found at $PROJECT_DIR"
  echo "Clone or rsync the repo first, e.g.:"
  echo "  mkdir -p ~/projects && rsync -a --exclude target --exclude node_modules /mnt/c/Users/you/typr/ ~/projects/typr/"
  exit 1
fi

echo "==> Installing npm dependencies..."
cd "$PROJECT_DIR/apps/desktop"
npm install

echo "==> Verifying Rust workspace..."
cd "$PROJECT_DIR"
source "$HOME/.cargo/env" 2>/dev/null || true
cargo test --workspace

echo ""
echo "Done. Start development with:"
echo "  cd $PROJECT_DIR/apps/desktop && npm run tauri dev"
