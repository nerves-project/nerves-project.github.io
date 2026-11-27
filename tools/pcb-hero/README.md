# Nerves stackup hero

Interactive WebGPU hero (`static/hero-pcb/`) that renders the Nerves Starter Kit, a 4-layer
board by Protolux Electronics, as an explodable stack, one copper layer per layer of Nerves:

| Copper | Nerves layer |
| ------ | ------------ |
| F.Cu   | Application  |
| In1.Cu | BEAM         |
| In2.Cu | System       |
| B.Cu   | Tooling      |

Prototype page: `/hero-pcb/` (`static/hero-pcb/index.html`).

## How it's drawn

- **Board**: WebGPU, plates and parts flat-shaded in three tones. The plates are textures drawn
  from the KiCad board (`pcb.json`); the parts are the models of the board's STEP export
  (`parts.bin`, loaded after the first frames, with plain boxes standing in until then and for
  the boards in the distance). An ink pass draws fine lines where
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

## The live demo

A "Try Me" sign points at one of the board's buttons. Clicking it (or the button) starts
[jsnerves](https://github.com/lawik/jsnerves): a RISC-V machine emulated in WebAssembly that
runs a Nerves firmware, restored from a snapshot so it is at the IEx prompt as soon as it has
downloaded (about 40 MB, fetched only on that click).

- `nerves-demo.js` opens a panel over the hero's left side (on small screens, in place of the
  copy above the board): a progress bar while the firmware downloads, then the terminal.
- `pcb-hero.js` (`setDemo`) smacks the plates together into one board, turns the camera top
  down and takes everything explanatory away. The board's own parts are the machine's hardware
  (`DEMO_BOARD`):

  | Part | In the demo |
  | ---- | ----------- |
  | SW1, SW4 (push buttons) | `BUTTON_1`, `BUTTON_2`: GPIO inputs, 1 while held |
  | SW3 (slide switch) | the power switch, as on the real board: off cuts the machine's power, on starts it again |
  | D18 (white) | power: lit while the machine runs |
  | D2 (green), D3 (red) | `LED_READY`, `LED_SLOT_A`, driven by the firmware |
  | U12 (TMP103) | an I2C temperature sensor at `0x70`; a slider on the board sets what it reads |
  | U9 (the SD NAND the firmware is on) | a card under it says which firmware runs and offers "Update to v1.2.3", "Downgrade to v1.2.2" and "Revert to previous" |

  The firmware's frame-rate sensor (I2C `0x10`, `WebDemoNerves.Board.fps()`) is there too; it
  has no part. `LED_SLOT_B` has no LED on this board and `BUTTON_3` no button.
- The machine runs in a frame of its own (`vm/frame.html`, which is the site's, not jsnerves'):
  a document can run one machine once, so power off removes the frame and power on makes a new
  one. A machine that wrote to its disk boots for real when it gets power back (15 to 20 s,
  log in the terminal); one that did not is restored from the snapshot again.
- Firmware updates are real: the page fetches a fwup delta (about 140 KB, `vm/updates/`), writes
  it to a scratch area of the machine's disk, and the firmware applies it with fwup to the slot
  that is not running and reboots into it. The new firmware validates itself a few seconds after
  it is up; until then the card offers nothing. Revert switches back to the other slot.
  The 1.2.3 firmware gives the green LED a heartbeat, so the difference shows on the board.
- Without WebGPU the terminal still opens, with the LEDs and buttons in a strip under it.
- The log is attached to the console when the prompt is ready (`RingLogger.attach()`), so that
  a button press shows at once.

`static/hero-pcb/vm/` is a copy of what jsnerves serves (emulator, `nerves-vm.js`, `board.js`,
terminal, OpenSBI, U-Boot, the disk image in blocks, its snapshot and the firmware updates).
Update it from a jsnerves checkout, after `extract_firmware.sh` and `tools/make_deltas.exs`
there have made a new image and its updates:

```sh
tools/pcb-hero/sync_jsnerves.sh ../jsnerves
```

`vm/VERSION` records the jsnerves commit. The firmware is
[web-demo-nerves](https://github.com/lawik/web-demo-nerves) on
[nerves_system_jslinux](https://github.com/underjord/nerves_system_jslinux); the emulator is
built from [TinyEMU](https://github.com/lawik/TinyEMU) (branch `emscripten-modern`, MIT).

## Regenerating the board data

From the board's KiCad file and its STEP export (File > Export > STEP in KiCad's board editor):

```sh
python3 tools/pcb-hero/extract_kicad.py nsk.kicad_pcb static/hero-pcb/pcb.json
pip install cadquery-ocp numpy
python3 tools/pcb-hero/extract_step.py nsk.step static/hero-pcb/parts.bin --cache /tmp/nsk
```

`extract_kicad.py` needs only the Python standard library. `extract_step.py` tessellates every
part of the STEP assembly with its colours (reading a 60 MB STEP file takes about ten minutes;
`--cache` keeps the result), leaves out the board itself and writes one mesh. Parts and models
are matched by position, so the two files have to be of the same board revision. Positions in
`pcb-hero.js` (`DEFAULT_EXTRAS`, `DEMO_BOARD`, `CFG.ports`) and `textures.js` (`LAYER_SOURCES`)
are board millimetres or references of this board.

## Attribution

The Nerves Starter Kit ("Sprout" v0.2) is Copyright 2025 Protolux Electronics, designed by
Gus Workman, licensed under CERN-OHL-S v2 and shown here with permission. `pcb.json` and
`parts.bin` are converted from its design files: the board's copper, pads, silkscreen (with
the Protolux Electronics and Nerves marks on it) and part models, nothing redrawn.

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

The hero page credits the board below the illustration.

### Font

The handwritten callouts use [Caveat](https://github.com/googlefonts/caveat) (latin subset, weights 500–700),
self-hosted at `static/hero-pcb/fonts/caveat-latin.woff2` under the SIL Open Font License 1.1
(`static/hero-pcb/fonts/OFL-Caveat.txt`).
