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
