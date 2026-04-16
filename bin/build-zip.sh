#!/usr/bin/env bash
set -euo pipefail

VERSION=$(node -p "require('./manifest.json').version")
STAGE="build/lumina-new-tab"

rm -rf build
mkdir -p "$STAGE"

cp -r \
  manifest.json \
  newtab.html \
  newtab.js \
  popup.html \
  popup.js \
  background.js \
  gemini.js \
  claude-ai.js \
  chatgpt.js \
  tiptap-bundle.js \
  icons \
  "$STAGE/"

( cd build && zip -r "../lumina-new-tab-${VERSION}.zip" "lumina-new-tab" >/dev/null )

echo "Built lumina-new-tab-${VERSION}.zip"
