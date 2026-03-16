#!/usr/bin/env bash
# =============================================================================
# build-wasm.sh — Compile Rust to WebAssembly (two targets)
#
#   pkg-node/     → wasm-pack --target nodejs  (Node.js CJS, synchronous load)
#   pkg-bundler/  → wasm-pack --target bundler (ESM + browsers via bundler)
#
# Requirements: Rust + wasm-pack installed (run `npm run setup` first)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
RUST_DIR="${PACKAGE_DIR}/rust"
WASM_DIR="${PACKAGE_DIR}/src/wasm"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m'

info()    { echo -e "${CYAN}[build-wasm]${NC} $1"; }
success() { echo -e "${GREEN}[build-wasm]${NC} $1"; }

# Source cargo env in case this is run without a login shell
# shellcheck source=/dev/null
source "${HOME}/.cargo/env" 2>/dev/null || true

# --------------------------------------------------------------------------- #
# Guards
# --------------------------------------------------------------------------- #
if ! command -v wasm-pack &>/dev/null; then
  echo "ERROR: wasm-pack not found. Run 'npm run setup' first." >&2
  exit 1
fi

if [ ! -f "${RUST_DIR}/Cargo.toml" ]; then
  echo "ERROR: ${RUST_DIR}/Cargo.toml not found." >&2
  exit 1
fi

# --------------------------------------------------------------------------- #
# Build: nodejs target (used by CJS, synchronous readFileSync loading)
# --------------------------------------------------------------------------- #
info "Building nodejs target → src/wasm/pkg-node/ ..."
wasm-pack build \
  "${RUST_DIR}" \
  --target nodejs \
  --out-dir "${WASM_DIR}/pkg-node" \
  --out-name archi_validation \
  --release \
  -- --features wasm
success "nodejs target built"

# --------------------------------------------------------------------------- #
# Build: bundler target (used by ESM / browser bundlers like vite, webpack)
# --------------------------------------------------------------------------- #
info "Building bundler target → src/wasm/pkg-bundler/ ..."
wasm-pack build \
  "${RUST_DIR}" \
  --target bundler \
  --out-dir "${WASM_DIR}/pkg-bundler" \
  --out-name archi_validation \
  --release \
  -- --features wasm
success "bundler target built"

success "WASM build complete."
