#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-.}"
VERSION=$(node -p "require('./manifest.json').version")
STAGE="build/lumina-new-tab"

rm -rf build
mkdir -p "$STAGE" "$OUT_DIR"

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

ZIP_PATH="$OUT_DIR/lumina-new-tab-${VERSION}.zip"
rm -f "$ZIP_PATH"
( cd build && zip -r "$OLDPWD/$ZIP_PATH" "lumina-new-tab" >/dev/null )

echo "Built $ZIP_PATH"
