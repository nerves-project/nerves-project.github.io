#!/bin/sh
# Build everything the hero's live demo serves, from the sources named in demo-sources.env,
# and put it in static/hero-pcb/vm/:
#
#   1. the emulator (TinyEMU, compiled to WebAssembly with emscripten)
#   2. the firmware, once per version (mix firmware)
#   3. the disk image of the first version in blocks, and its boot snapshot
#   4. delta updates between the versions (fwup_delta)
#   5. the copy into the site (sync_jsnerves.sh)
#
# Usage:
#   tools/pcb-hero/build_demo.sh [work directory]
#
# The work directory (default: a new temporary one) gets the checkouts and build output; give
# one to keep them between runs. DEMO_OUT is where the result goes instead of the site's
# static/hero-pcb/vm (to look at a build without touching the site).
#
# Needs on PATH: git, make, emcc (emscripten), elixir and mix with the nerves_bootstrap archive,
# fwup, mksquashfs, xdelta3, zip, unzip, node (20.11 or later) and GNU coreutils. The snapshot
# is made in Playwright's headless Chromium, which the build installs; with
# DEMO_BROWSER_DEPS=1 it also installs the system libraries Chromium needs (uses sudo).
set -eu

here=$(cd "$(dirname "$0")" && pwd)
. "$here/demo-sources.env"

for tool in git make emcc elixir mix fwup mksquashfs xdelta3 zip unzip node; do
  command -v "$tool" >/dev/null 2>&1 || { echo "build_demo.sh: $tool is not on PATH" >&2; exit 1; }
done

work=${1:-$(mktemp -d)}
mkdir -p "$work"
work=$(cd "$work" && pwd)
echo "Building in $work"

# checkout <repository> <ref> <directory>: that commit or tag, and nothing else of the history
checkout() {
  if [ ! -d "$3/.git" ]; then
    git init -q "$3"
    git -C "$3" remote add origin "$1"
  fi
  git -C "$3" remote set-url origin "$1"
  git -C "$3" fetch -q --depth 1 origin "$2"
  git -C "$3" checkout -q --detach --force FETCH_HEAD
}

echo "== Emulator: $TINYEMU_REF"
checkout "$TINYEMU_REPO" "$TINYEMU_REF" "$work/tinyemu"
make -C "$work/tinyemu" -f Makefile.js js/riscvemu64-wasm.js

echo "== jsnerves: $JSNERVES_REF"
checkout "$JSNERVES_REPO" "$JSNERVES_REF" "$work/jsnerves"
cp "$work/tinyemu/js/riscvemu64-wasm.js" "$work/tinyemu/js/riscvemu64-wasm.wasm" "$work/jsnerves/"

mkdir -p "$work/fw"
firmwares=""
images=""
for ref in $FIRMWARE_REFS; do
  echo "== Firmware: $ref"
  checkout "$FIRMWARE_REPO" "$ref" "$work/firmware"
  (
    cd "$work/firmware"
    export MIX_TARGET=jslinux
    mix deps.get
    mix firmware
  )
  fw=$(ls "$work"/firmware/_build/jslinux_*/nerves/images/*.fw | head -n 1)
  cp "$fw" "$work/fw/$ref.fw"
  firmwares="$firmwares $work/fw/$ref.fw"
  # OpenSBI and U-Boot come from the system of the first version, the one in the disk image
  if [ -z "$images" ]; then
    system=$(cat "$work/firmware/deps/nerves_system_jslinux/VERSION")
    images="${NERVES_ARTIFACTS_DIR:-$HOME/.nerves/artifacts}/nerves_system_jslinux-portable-$system/images"
    [ -d "$images" ] || { echo "build_demo.sh: no system images in $images" >&2; exit 1; }
  fi
done

echo "== Disk image and snapshot"
if [ "${DEMO_BROWSER_DEPS:-}" = 1 ]; then
  (cd "$work/jsnerves/tools" && npm ci --no-audit --no-fund && sudo npx playwright install-deps chromium)
fi
# shellcheck disable=SC2086
set -- $firmwares
(cd "$work/jsnerves" && ./extract_firmware.sh "$1" "$images")

echo "== Delta updates"
(cd "$work/jsnerves" && elixir tools/make_deltas.exs "$@")

echo "== Copy into the site"
out=${DEMO_OUT:-}
"$here/sync_jsnerves.sh" "$work/jsnerves" $out
{
  echo "tinyemu $TINYEMU_REF"
  echo "firmware $FIRMWARE_REFS ($FIRMWARE_REPO)"
  echo "system nerves_system_jslinux $system"
} >> "${out:-$here/../../static/hero-pcb/vm}/VERSION"
