---
type: getting_started
title: Getting started
description: Three ways to get started with Nerves. Try Nerves Livebook without building anything, start from a working example, or make your own firmware from scratch.

head:
  eyebrow: Getting started
  title: Three <span class="hl">ways in</span>
  lede: Pick by how much you want to set up today. All three end with Elixir running on real hardware.

needs:
  title: What you’ll need
  items:
    - text: a board, like a Raspberry Pi
      checked: true
    - text: a microSD card and a card reader
      checked: true
    - text: macOS or Linux (Windows via WSL)

# setup: how much there is to install before you start, out of 3.
paths:
  - id: livebook
    label: Try it out
    badge: No build required
    title: Nerves Livebook
    setup: 1
    setup_note: no toolchain needed
    text: A prebuilt firmware image with Livebook inside, so you can play on real hardware straight away and work through guided tutorials from your browser.
    steps:
      - Download the firmware image for your board
      - Burn it to a microSD card and boot the board
      - Open `nerves.local` in your browser and follow along
    actions:
      - text: Get Nerves Livebook
        url: https://github.com/nerves-livebook/nerves_livebook/blob/main/README.md
        style: primary

  - id: examples
    label: Build an example
    title: Start from something that works
    setup: 2
    setup_note: great for learning the ropes
    text: The Nerves team maintains a set of small example projects. Set up your development environment, build one for your board, and use it as the starting point for your own idea.
    examples:
      repo: https://github.com/nerves-project/nerves_examples
      items:
        - name: blinky
          text: 'The hello world: blink an LED'
        - name: hello_live_view
          text: A LiveView UI served from the device
        - name: hello_gpio
          text: Read buttons and drive LEDs on GPIO pins
        - name: hello_wifi
          text: Get onto a wireless network
    actions:
      - text: See all examples
        url: https://github.com/nerves-project/nerves_examples
        style: ghost
    aside: Needs the toolchain from step 3’s install guide

  - id: diy
    label: Full DIY
    title: Your own firmware, from scratch
    setup: 3
    setup_note: where products start
    text: Install the development environment, generate a new Nerves app for your target, and build and burn firmware yourself. This is the path most production projects start from.
    terminal:
      - '# once'
      - '$ mix archive.install hex nerves_bootstrap'
      - ''
      - '# a new project'
      - '$ mix nerves.new hello_nerves'
      - '$ cd hello_nerves'
      - '$ export MIX_TARGET=rpi4'
      - '$ mix deps.get'
      - '$ mix firmware'
      - '$ mix burn'
    actions:
      - text: Installation guide
        url: https://nerves.hexdocs.pm/installation.html
        style: ghost
      - text: Create a new Nerves app
        url: https://nerves.hexdocs.pm/getting-started.html#creating-a-project
        style: link

stuck:
  text: '**Stuck somewhere?** Ask in the Discord. Beginner questions are welcome.'
  link_text: Discord
---
