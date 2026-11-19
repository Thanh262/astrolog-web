#!/usr/bin/env bash
# Build Astrolog's C++ core to WebAssembly (run inside WSL Ubuntu).
# Sources come from astrolog-source/ (an unmodified copy of Astrolog 7.80's source).
# They are copied to .build/ and only the copy's astrolog.h is patched to drop the
# Windows-only parts. Data files are refreshed from a full Astrolog install when one
# sits next to this folder (../atlas.as etc.); otherwise public/data is kept as is.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="${ASTROLOG_SRC:-$HERE/astrolog-source}"
ROOT="${ASTROLOG_DIR:-$HERE/..}"
WORK="$HERE/.build"
OUT="$HERE/public"

# shellcheck disable=SC1090
source ~/emsdk/emsdk_env.sh >/dev/null 2>&1

rm -rf "$WORK"
mkdir -p "$WORK" "$OUT/data/ephem"
cp "$SRC"/*.cpp "$SRC"/*.h "$WORK/"

# Headless build: no Win32 UI, no installer helpers, no live JPL web queries.
sed -i \
  -e 's|^#define PC |//#define PC |' \
  -e 's|^#define WIN |//#define WIN |' \
  -e 's|^#define WSETUP|//#define WSETUP|' \
  -e 's|^#define JPLWEB|//#define JPLWEB|' \
  "$WORK/astrolog.h"

cd "$WORK"
emcc -O2 -w -U_FORTIFY_SOURCE *.cpp -o "$OUT/astrolog.js" \
  -sMODULARIZE=1 -sEXPORT_NAME=createAstrolog \
  -sINVOKE_RUN=0 -sEXIT_RUNTIME=1 \
  -sALLOW_MEMORY_GROWTH=1 -sSTACK_SIZE=8MB \
  -sFORCE_FILESYSTEM=1 \
  -sENVIRONMENT=web,node \
  -sEXPORTED_RUNTIME_METHODS=callMain,FS

# Data files Astrolog reads at runtime (settings, atlas, time zones, stars, ephemeris).
if [ -f "$ROOT/atlas.as" ] && [ -d "$ROOT/ephem" ]; then
  cp "$ROOT"/astrolog.as "$ROOT"/atlas.as "$ROOT"/timezone.as \
     "$ROOT"/sefstars.txt "$ROOT"/seorbel.txt "$ROOT"/astexo.csv "$OUT/data/"
  cp "$ROOT"/ephem/*.se1 "$OUT/data/ephem/"
  ( cd "$OUT/data" && ls ephem/*.se1 ) > "$OUT/data/ephem.txt"
fi

ls -la "$OUT"/astrolog.js "$OUT"/astrolog.wasm
