#!/usr/bin/env bash
# Builds the app shell served at wemiller.com/tools/monkr/app/ into build-portfolio/.
# Only the code and small files are in it (~1 MB): the device frames and background
# photos (~150 MB) stay on monkr.wemiller.com and are loaded from there with CORS
# (src/lib/site.ts). The portfolio's mirror-app-docs workflow runs this.
set -euo pipefail
cd "$(dirname "$0")/.."
export MONKR_BASE=/tools/monkr/app
export MONKR_OUT="${MONKR_OUT:-build-portfolio}"
export VITE_MONKR_MEDIA_ORIGIN="${VITE_MONKR_MEDIA_ORIGIN:-https://monkr.wemiller.com}"
export VITE_MONKR_LEGACY_ORIGIN="${VITE_MONKR_LEGACY_ORIGIN:-https://monkr.wemiller.com}"
npx vite build
rm -rf "$MONKR_OUT/devices" "$MONKR_OUT/backgrounds" "$MONKR_OUT/CNAME" "$MONKR_OUT/og-image.png"
du -sh "$MONKR_OUT"
