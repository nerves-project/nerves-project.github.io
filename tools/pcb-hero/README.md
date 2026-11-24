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

## How it's drawn

- **Board**: WebGPU, plates and parts flat-shaded in three tones. An ink pass draws fine lines where
  depth folds, normals turn or one surface meets another, and a heavy brush line round the front
  board's whole silhouette (from a small g-buffer). The boards in the distance get no ink; they fade
  toward the paper colour.
- **Marks**: loops, sketched boxes, highlighter swipes and crayon links are world-space strokes in a
  paint pass, depth-tested against the board. The middle layers get black marker and crayon, the
  bottom layer a white paint pen. Where the Erlang links pass behind a plate they show dashed.
  Linux, U-Boot and Buildroot are handwritten on their plates (in the layer textures).
- **On top**: a 2D canvas draws the project stickers and the NervesHub cloud with its health and
  firmware puffs; the callouts and layer labels are HTML.
- **Motion**: each layer has its own clock and only the active one runs (the Application layer when
  nothing is focused), so only that layer's marks wobble (`boil`, 8 times a second) and move. With
  reduced motion every clock stops.

## Regenerating the board data

```sh
git clone https://github.com/protolux-electronics/trellis_core /tmp/trellis_core
python3 tools/pcb-hero/extract_kicad.py /tmp/trellis_core/src/trellis_core.kicad_pcb static/hero-pcb/pcb.json
```

Only the Python standard library is needed.

## Attribution

Trellis Core is Copyright 2025 Protolux Electronics, licensed under CERN-OHL-P v2.
Modification: the board geometry is converted to JSON and the Protolux Electronics
logo (board-level silkscreen) is left out, per the repository's trademark notice, as is the
TRELLIS CORE wordmark.

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
  [elixir-circuits.github.io](https://elixir-circuits.github.io/).

The project logos are shown as stickers floating over their parts.

The System and Tooling layers mark Linux, U-Boot and Buildroot with plain named squares, not logos.

The hero page credits Trellis below the illustration.

### Font

The handwritten callouts use [Caveat](https://github.com/googlefonts/caveat) (latin subset, weights 500–700),
self-hosted at `static/hero-pcb/fonts/caveat-latin.woff2` under the SIL Open Font License 1.1
(`static/hero-pcb/fonts/OFL-Caveat.txt`).
