# Nerves stackup hero

Interactive WebGPU hero (`static/hero-pcb/`) that renders the
[Trellis Core](https://github.com/protolux-electronics/trellis_core) 4-layer board
as an explodable stack, one copper layer per layer of Nerves:

| Copper | Nerves layer |
| ------ | ------------ |
| F.Cu   | Application  |
| In1.Cu | BEAM         |
| In2.Cu | System       |
| B.Cu   | Tooling      |

Prototype page: `/hero-pcb/` (`static/hero-pcb/index.html`).

## Regenerating the board data

```sh
git clone https://github.com/protolux-electronics/trellis_core /tmp/trellis_core
python3 tools/pcb-hero/extract_kicad.py /tmp/trellis_core/src/trellis_core.kicad_pcb static/hero-pcb/pcb.json
```

Only the Python standard library is needed.

## Attribution

Trellis Core is Copyright 2025 Protolux Electronics, licensed under CERN-OHL-P v2.
Modification: the board geometry is converted to JSON and the Protolux Electronics
logo (board-level silkscreen) is left out, per the repository's trademark notice.

### Logos

Project logos are trademarks of their owners, shown to refer to those projects.
Check with each project before publishing.

- **Phoenix**: mark path from the Phoenix installer templates
  ([phoenixframework/phoenix](https://github.com/phoenixframework/phoenix), MIT), drawn monochrome in Phoenix orange.
- **Membrane**: from `assets/logo.svg` in
  [membraneframework/membrane_core](https://github.com/membraneframework/membrane_core) (Apache-2.0), monochrome.
- **Nx**: the "Nx" wordmark redrawn as thin strokes after the
  [elixir-nx/nx](https://github.com/elixir-nx/nx) logo; the mascot is not used.
- **BEAM Bots**: `static/hero-pcb/logos/beam-bots.svg`, unmodified, from
  [beam-bots/bb](https://github.com/beam-bots/bb) © 2025 James Harton (LicenseRef-Beam-Bots-Logo), used with permission.
- **Elixir Circuits**: `static/hero-pcb/logos/elixir-circuits.png`, the logo from
  [elixir-circuits.github.io](https://elixir-circuits.github.io/); the hologram glows its light parts in the logo's purple.
- **U-Boot**: monochrome adaptation of `tools/logos/u-boot_logo.svg` from
  [u-boot/u-boot](https://github.com/u-boot/u-boot), © 2018 Heinrich Schuchardt, CC-BY-SA-4.0.
  The adaptation (in `static/hero-pcb/logos.js`) is shared under the same licence.
- **Buildroot**: `static/hero-pcb/logos/buildroot.png`, the logo from `docs/website/images/logo.png` in
  [buildroot/buildroot](https://gitlab.com/buildroot.org/buildroot), printed on the Tooling layer as a halftone.
- **Linux**: the penguin is an original drawing standing in for Tux. To use Tux, replace `logo: 'penguin'`
  in `LAYER_SOURCES` (`static/hero-pcb/textures.js`) with `image: 'logos/tux.svg'`, adding `color: true` to
  print a colour file as is (without it the file is etched in one colour from its transparency). Tux is by
  Larry Ewing (lewing@isc.tamu.edu) and The GIMP; the vector versions are by Simon Budig, whose notice must
  ship with them (`static/hero-pcb/logos/README-penguin-simon-budig.txt`), and Garrett LeSage (CC0).
  Add the Tux credit to the credit line in `static/hero-pcb/index.html`.

The hero page credits Trellis, the Buildroot and U-Boot logos and the Linux trademark below the illustration.
