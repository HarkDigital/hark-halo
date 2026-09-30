#!/bin/sh
# The Portfolio's half-size screenshots: public/work/640/<id>.webp (640×400) for
# every public/work/<id>.webp that has no newer one. Run after adding a site
# (npm run thumbs) and commit the outputs; CI never runs this.
# Needs cwebp (brew install webp).
set -e
cd "$(dirname "$0")/.."
CWEBP="$(command -v cwebp || echo /opt/homebrew/bin/cwebp)"
mkdir -p public/work/640
for src in public/work/*.webp; do
  [ -e "$src" ] || continue
  out="public/work/640/$(basename "$src")"
  if [ ! -e "$out" ] || [ "$src" -nt "$out" ]; then
    "$CWEBP" -quiet -q 80 -resize 640 0 "$src" -o "$out"
    echo "thumb  $out"
  fi
done
