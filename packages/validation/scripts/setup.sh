#!/usr/bin/env bash
# =============================================================================
# setup.sh — Install Rust toolchain + wasm-pack from scratch
# Run this once before building the validation package:  npm run setup
# =============================================================================
set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${CYAN}[setup]${NC} $1"; }
success() { echo -e "${GREEN}[setup]${NC} $1"; }
warn()    { echo -e "${YELLOW}[setup]${NC} $1"; }
error()   { echo -e "${RED}[setup]${NC} $1"; exit 1; }

# --------------------------------------------------------------------------- #
# 1. Rust via rustup
# --------------------------------------------------------------------------- #
if command -v rustup &>/dev/null; then
  success "rustup already installed: $(rustup --version)"
else
  info "Installing Rust via rustup..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
  # Source cargo env so subsequent commands see rustc/cargo
  # shellcheck source=/dev/null
  source "${HOME}/.cargo/env"
  success "Rust installed: $(rustc --version)"
fi

# Ensure cargo env is sourced for the rest of this script
# shellcheck source=/dev/null
source "${HOME}/.cargo/env" 2>/dev/null || true

# --------------------------------------------------------------------------- #
# 2. wasm32-unknown-unknown target
# --------------------------------------------------------------------------- #
if rustup target list --installed | grep -q 'wasm32-unknown-unknown'; then
  success "wasm32-unknown-unknown target already installed"
else
  info "Adding wasm32-unknown-unknown target..."
  rustup target add wasm32-unknown-unknown
  success "wasm32-unknown-unknown target added"
fi

# --------------------------------------------------------------------------- #
# 3. wasm-pack
# --------------------------------------------------------------------------- #
if command -v wasm-pack &>/dev/null; then
  success "wasm-pack already installed: $(wasm-pack --version)"
else
  info "Installing wasm-pack..."
  # Try the official installer first (faster than cargo install)
  if curl --proto '=https' --tlsv1.2 -sSf https://rustwasm.github.io/wasm-pack/installer/init.sh | sh; then
    success "wasm-pack installed: $(wasm-pack --version)"
  else
    warn "Official installer failed, falling back to cargo install..."
    cargo install wasm-pack
    success "wasm-pack installed via cargo: $(wasm-pack --version)"
  fi
fi

# --------------------------------------------------------------------------- #
# Done
# --------------------------------------------------------------------------- #
echo ""
success "All tools ready! Next step:"
echo -e "  ${CYAN}npm run build:wasm${NC}   — compile Rust to WebAssembly"
echo -e "  ${CYAN}npm run build${NC}         — full build (WASM + TypeScript)"
echo -e "  ${CYAN}npm test${NC}              — run tests (requires build first)"
