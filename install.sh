#!/bin/bash
# Build AsanaBar and install it into /Applications.
set -euo pipefail

cd "$(dirname "$0")"

echo "▶ npm install…"
npm install

echo "▶ Packaging AsanaBar…"
npm run package

APP_PATH=$(find out -maxdepth 2 -name "AsanaBar.app" -type d | head -n 1)
if [ -z "$APP_PATH" ]; then
  echo "✗ AsanaBar.app introuvable dans out/" >&2
  exit 1
fi

echo "▶ Installation dans /Applications…"
rm -rf "/Applications/AsanaBar.app"
cp -R "$APP_PATH" /Applications/

echo "✓ AsanaBar installé. Lancement…"
open /Applications/AsanaBar.app
