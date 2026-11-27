#!/bin/sh
# Copy the files the hero's live demo serves from a jsnerves checkout into static/hero-pcb/vm/.
#   tools/pcb-hero/sync_jsnerves.sh ../jsnerves
# Only what the page loads is copied: the emulator, the NervesVM and board APIs, the terminal,
# the firmware (OpenSBI, U-Boot, the disk image in blocks) and its snapshot.
set -eu
src=${1:?usage: sync_jsnerves.sh <jsnerves checkout>}
dst=$(cd "$(dirname "$0")/../.." && pwd)/static/hero-pcb/vm
[ -f "$src/nerves-vm.js" ] || { echo "$src is not a jsnerves checkout" >&2; exit 1; }
rm -rf "$dst"
mkdir -p "$dst"
for f in nerves-vm.js board.js term.js riscvemu64-wasm.js riscvemu64-wasm.wasm nerves.cfg opensbi.bin u-boot.bin; do
  cp "$src/$f" "$dst/$f"
done
chmod 644 "$dst"/*
cp -R "$src/disk" "$dst/disk"
# The emulator resolves the disk image against the page, not against nerves.cfg (its firmware
# files it does find beside the configuration), so name it from the site's root.
sed -i 's|file: "disk/|file: "/hero-pcb/vm/disk/|' "$dst/nerves.cfg"
grep -q 'file: "/hero-pcb/vm/disk/' "$dst/nerves.cfg" || { echo "nerves.cfg: no drive to point at the site" >&2; exit 1; }
{
  echo "jsnerves $(git -C "$src" rev-parse --short HEAD) ($(git -C "$src" rev-parse --abbrev-ref HEAD))"
  echo "disk image $(basename "$(ls -d "$src"/disk/*/)")"
} > "$dst/VERSION"
echo "copied $(du -sh "$dst" | cut -f1) into $dst"
cat "$dst/VERSION"
