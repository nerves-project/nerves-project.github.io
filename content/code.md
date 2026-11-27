---
type: code
title: Code
description: Nerves is spread over many small repositories, each with a focused scope. Here is the map, grouped the same way as the main README.
tags: []

# The repo map itself lives in data/code.yaml.
eyebrow: Code
heading: Explore the <span class="hl">project</span>
lede: Nerves is spread over many small repositories, each with a focused scope. Here’s the map, grouped the same way as the [main README](https://github.com/nerves-project/nerves#nerves-projects).

# The hand-drawn layer plates in the header
plate_label: your_app
layers:
  - key: app
    code: L1 · Application
    note: your code, plus examples
  - key: beam
    code: L2 · BEAM
    note: erlinit, nerves_runtime, vintage_net
  - key: system
    code: L3 · System
    note: nerves_system_*, Buildroot
  - key: tooling
    code: L4 · Tooling
    note: nerves_bootstrap, toolchains

help:
  title: Need help?
  text: Most answers are an issue search away.
  links:
    - text: Search the issue tracker
      url: "https://github.com/issues?q=is%3Aopen+is%3Aissue+org%3Anerves-project+org%3Anerves-time+org%3Anerves-networking+archived%3Afalse+"
    - text: Submit an issue
      url: https://github.com/nerves-project/nerves/issues/new
    - text: Ask in the Discord
      url: https://discord.gg/7TqSpepHw7

plays_well:
  eyebrow: Related projects
  title: Plays well with
  link_text: All related projects
  # each tile links to its section on /related_projects/
  tiles:
    - key: nerveshub
      name: NervesHub
      text: Over-the-air updates and fleet management
    - key: beam-bots
      name: BEAM Bots
      text: Robots, declared in Elixir
    - key: phoenix
      name: Phoenix
      text: A web UI on the device itself
    - key: membrane
      name: Membrane
      text: Cameras, audio and streams
    - key: nx
      name: Nx
      text: Inference at the edge
---
