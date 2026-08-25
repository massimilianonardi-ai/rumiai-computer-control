#!/bin/sh

set -eu

VERSION="0.8.0"
SOURCE_ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
PORTABLE_ROOT="${RUMIAI_CC_PORTABLE_ROOT:-}"
AGENT_CTRL_VERSION="0.1.4"
AGENT_CTRL_SOURCE="${RUMIAI_CC_AGENT_CTRL_SOURCE:-}"

usage() {
  echo "Usage: $0 --portable-root PATH"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --portable-root)
      [ "$#" -ge 2 ] || { usage >&2; exit 2; }
      PORTABLE_ROOT="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

[ -n "$PORTABLE_ROOT" ] || {
  echo "A project-local --portable-root is required; no system or user-profile default is allowed." >&2
  exit 2
}

case "$PORTABLE_ROOT" in
  /*) ;;
  *) echo "--portable-root must be an absolute project path." >&2; exit 2 ;;
esac

case "$PORTABLE_ROOT" in
  "$HOME"|"$HOME/.local"|"$HOME/.local/"*|/usr|/usr/*|/opt|/opt/*|/Library|/Library/*|/Applications|/Applications/*)
    echo "Refusing non-portable installation root: $PORTABLE_ROOT" >&2
    exit 2
    ;;
esac

[ "$(uname -s)" = "Darwin" ] || {
  echo "RumiAI Computer Control 0.8.0 currently supports macOS only." >&2
  exit 2
}

case "$(uname -m)" in
  arm64)
    AGENT_CTRL_ASSET="agent-ctrl-darwin-arm64"
    AGENT_CTRL_SHA256="68b3a6a17b068d2a5ddbc39a422c84fdb21cd620059ed913b0469ada61bc3378"
    ;;
  x86_64)
    AGENT_CTRL_ASSET="agent-ctrl-darwin-x64"
    AGENT_CTRL_SHA256="5ec48718ead182bed698f3cf050bda840ac32d0724586ba7bc5c63be9b19e284"
    ;;
  *)
    echo "Unsupported macOS architecture: $(uname -m)" >&2
    exit 2
    ;;
esac

INSTALL_ROOT="$PORTABLE_ROOT/rumiai-computer-control"
DESTINATION="$INSTALL_ROOT/$VERSION"
CURRENT="$INSTALL_ROOT/current"

if [ -e "$DESTINATION" ] || [ -L "$DESTINATION" ]; then
  echo "Version $VERSION is already installed at $DESTINATION" >&2
  exit 3
fi

mkdir -p "$INSTALL_ROOT"
TEMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/rumiai-cc-install.XXXXXX")"
trap 'rm -rf "$TEMP_ROOT"' EXIT INT TERM HUP
STAGED="$TEMP_ROOT/$VERSION"
mkdir -p "$STAGED"

(cd "$SOURCE_ROOT" && tar \
  --exclude='.git' \
  --exclude='.DS_Store' \
  --exclude='local' \
  --exclude='backends/macos/runtime/bin/agent-ctrl' \
  --exclude='backends/macos/runtime/bin/rumiai-*' \
  -cf - .) | (cd "$STAGED" && tar -xf -)

AGENT_CTRL_BIN="$STAGED/backends/macos/runtime/bin/agent-ctrl"
mkdir -p "$(dirname "$AGENT_CTRL_BIN")"
if [ -n "$AGENT_CTRL_SOURCE" ]; then
  cp "$AGENT_CTRL_SOURCE" "$AGENT_CTRL_BIN"
else
  curl -fL --retry 3 \
    "https://github.com/k4cper-g/agent-ctrl/releases/download/v${AGENT_CTRL_VERSION}/${AGENT_CTRL_ASSET}" \
    -o "$AGENT_CTRL_BIN"
fi

ACTUAL_SHA256="$(shasum -a 256 "$AGENT_CTRL_BIN" | awk '{print $1}')"
[ "$ACTUAL_SHA256" = "$AGENT_CTRL_SHA256" ] || {
  echo "agent-ctrl checksum mismatch" >&2
  exit 4
}
chmod 755 "$AGENT_CTRL_BIN"

xcrun --find swiftc >/dev/null
xcrun swiftc "$STAGED/backends/macos/runtime/tools/macos-focused-window.swift" \
  -o "$STAGED/backends/macos/runtime/bin/rumiai-macos-focused-window"
xcrun swiftc "$STAGED/backends/macos/runtime/tools/enable-ax-manual.swift" \
  -o "$STAGED/backends/macos/runtime/bin/rumiai-enable-ax-manual"
xcrun swiftc "$STAGED/backends/macos/runtime/tools/macos-window-bounds.swift" \
  -o "$STAGED/backends/macos/runtime/bin/rumiai-macos-window-bounds"
xcrun swiftc "$STAGED/backends/macos/runtime/tools/macos-window-minimized.swift" \
  -o "$STAGED/backends/macos/runtime/bin/rumiai-macos-window-minimized"

mv "$STAGED" "$DESTINATION"
ln -sfn "$VERSION" "$CURRENT"

trap - EXIT INT TERM HUP
rm -rf "$TEMP_ROOT"

echo "RumiAI Computer Control $VERSION installed."
echo "Home: $CURRENT"
echo "Adapter: $CURRENT/adapters/rumiai/compat.js"
echo "Command: $CURRENT/scripts/rumiai-computer-control"
