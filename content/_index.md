---
# The homepage. The hero board is the live PCB demo in static/hero-pcb/.
description: Nerves is the open-source embedded framework for shipping products with Elixir. Made for teams putting devices in the field, and happy to help with weekend projects too.
hero:
  title: Hardware doesn’t have to be <span class="hl">hard.</span>
  text: |
    **Nerves** is the open-source embedded framework for shipping products with Elixir.
    Made for teams putting devices in the field, and happy to help with weekend projects too.
  install: mix archive.install hex nerves_bootstrap
  credit: The board is the Nerves Starter Kit, open hardware by [Protolux Electronics](https://protolux.io).

start:
  eyebrow: Start here
  title: Pick your starting point
  aside: Not sure? Livebook gets real hardware doing things before you’ve installed anything.
  paths:
    - kind: livebook
      label: Try it out
      badge: No build required
      title: Nerves Livebook
      text: Flash a prebuilt image, boot your board and work through guided tutorials from the comfort of your browser.
      link: https://github.com/nerves-livebook/nerves_livebook/blob/main/README.md
      link_text: Get Nerves Livebook
    - kind: examples
      label: Build an example
      title: Working examples
      text: Set up your toolchain, pick a maintained example (Wi-Fi, LiveView, a blinking LED) and make it yours.
      link: https://github.com/nerves-project/nerves_examples
      link_text: Browse the examples
    - kind: diy
      label: Full DIY
      title: Your own firmware
      text: Install the toolchain, generate a fresh project for your target and build firmware from scratch.
      link: https://hexdocs.pm/nerves/installation.html
      link_text: Installation guide
  boards_title: Runs on boards you probably have in a drawer
  boards: [Raspberry Pi, BeagleBone, QEMU, OSD32MP1, MangoPi MQ-Pro, x86_64]
  targets_link: https://hexdocs.pm/nerves/supported-targets.html

stack:
  eyebrow: What’s in the box
  title: Everything between the silicon and your code
  aside: Nerves takes care of networking, logging, watchdogs, firmware updates and the rest of the plumbing, so your team can focus on what makes the device yours.
  layers:
    - name: Application
      key: app
      code: L1 · F.Cu
      text: "Your Elixir application, with the whole ecosystem along for the ride: web UIs, inference, media, robotics."
      parts: [Phoenix, Nx, Membrane, BEAM Bots, Elixir Circuits]
    - name: BEAM
      key: beam
      code: L2 · In1.Cu
      text: Boots straight into the Erlang VM. Supervisors restart what breaks, with a hardware watchdog as backup.
      parts: [VintageNet, RingLogger, Nerves Heart]
    - name: System
      key: system
      code: L3 · In2.Cu
      text: "A minimal Linux built with Buildroot: read-only root filesystem, A/B partitions, data kept separate."
      parts: [Linux, Buildroot, U-Boot, SquashFS]
    - name: Tooling
      key: tooling
      code: L4 · B.Cu
      text: Plain Mix tasks build firmware and get it onto devices, by SD card or over the network.
      parts: [mix firmware, mix burn, mix upload, fwup]
  why: and why it holds up in the field
  features:
    - name: Reliable
      text: A fault-tolerant Erlang runtime and immutable firmware, so you know exactly what’s running.
    - name: Lean
      text: Build up instead of trimming down. Firmware starts in the 20–30 MB range.
    - name: Secure
      text: Minimal and opt-in, with regular Erlang and Linux updates and SBOMs via Buildroot.
    - name: Portable
      text: Runs out of the box on common boards. Linux and Buildroot make porting to new ones easier.
    - name: Efficient
      text: Erlang’s I/O optimisations, like IOData, keep data copies down across the whole stack.
    - name: Extensible
      text: Nerves is one part of a lively ecosystem. Phoenix, Nx and Livebook all come along.

audience:
  eyebrow: Who it’s for
  title: Built for production devices, friendly to tinkerers
  aside: Nerves runs in commercial products in the field. The same tools work just as well on your desk.
  teams:
    eyebrow: For teams shipping products
    title: Ship it and sleep at night
    points:
      - Immutable firmware, so every device runs exactly what you built
      - A/B firmware updates that fall back to the last good version
      - Regular Erlang and Linux security updates, with SBOMs via Buildroot
      - Custom systems for your own boards, built the same way as the official ones
    link: /cases/
    link_text: Read the case studies
  tinkerers:
    eyebrow: For tinkerers and the curious
    title: Come play, no badge needed
    points:
      - Start on a Raspberry Pi you already own
      - Guided Livebook tutorials, no toolchain required
      - Books, talks and a newsletter to learn from
      - A Discord where beginner questions are welcome
    link: https://github.com/nerves-livebook/nerves_livebook/blob/main/README.md
    link_text: Try Nerves Livebook

cases:
  eyebrow: Out in the world
  title: Running in real products
  items:
    - name: FarmBot
      sector: Agriculture
      text: Managing fleets of open-source farming robots with Nerves.
      image: img/Farmbot-case-cover.jpg
      url: /cases/farmbot/
    - name: Hop
      sector: Hospitality
      text: A beer kiosk that pours with facial recognition.
      image: img/Hop-case-cover.jpg
      url: /cases/hop/
    - name: Le Tote
      sector: Logistics
      text: Keeping a fashion rental warehouse humming.
      image: img/LeTote-case-cover.jpg
      url: /cases/letote/

community:
  eyebrow: Community
  title: Come do Nerves with us
  text: Questions are welcome, beginners especially. We love hearing what you’re building.
  channels:
    - name: Discord
      icon: img/discord.svg
      text: Questions, answers and hanging out with fellow tinkerers
      url: https://discord.gg/7TqSpepHw7
    - name: Nerves Meetup
      icon: img/meetup.svg
      text: Talks and demos from the community, recorded for YouTube
      url: https://www.meetup.com/nerves
    - name: GitHub
      icon: img/github.svg
      text: The code, the issues and your first contribution
      url: https://github.com/nerves-project
  also:
    - name: Bluesky
      icon: img/bsky.svg
      url: https://bsky.app/profile/nerves-project.org
    - name: Mastodon
      icon: img/mastodon.svg
      url: https://fosstodon.org/@NervesProject
    - name: Conference talks
      icon: img/videos.svg
      url: /videos/
  newsletter:
    eyebrow: Straight to your inbox
    title: The Nerves Newsletter
    text: Releases, featured projects and talks, plus technical notes straight from the core team.
  writing_title: Fresh from the community

sponsors:
  eyebrow: Sponsors
  title: Kept going by people who build with it
---
