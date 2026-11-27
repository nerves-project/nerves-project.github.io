---
type: related_projects
title: Related Projects
date: 2022-01-01
description: Nerves is one part of a lively Elixir and Erlang ecosystem. These projects pair especially well with it, from fleet management to robots, web UIs, media and machine learning.
tags: []

eyebrow: Related projects
heading: Nerves keeps good company
lede: Nerves is one part of a lively Elixir and Erlang ecosystem. These projects pair especially well with it, from fleet management to robots, web UIs, media and machine learning.
jump_label: jump to

# Each featured project gets a full-width section in its own brand colours.
# The visual next to the copy is drawn by the template for each key.
featured:
  - key: nerveshub
    name: NervesHub
    eyebrow: NervesHub · Fleet management
    title: Ship it, then keep it running
    text: Over-the-air firmware updates and fleet management for Nerves devices, with staged rollouts, remote consoles and device health. Open source and self-hostable, or let NervesCloud run it for you.
    note: bad release? it puts itself back
    links:
      - text: Get started on NervesCloud
        url: https://nervescloud.com/
      - text: NervesHub documentation
        url: https://docs.nerves-hub.org/
        icon: arrow

  - key: beam-bots
    name: BEAM Bots
    eyebrow: BEAM Bots · Robotics
    title: Robots, declared in Elixir
    text: A framework for building resilient robots on the BEAM. Describe your robot declaratively, and let supervision keep it going when the hardware misbehaves.
    with_nerves: run it on the robot itself, from a Raspberry Pi up.
    note: supervised, naturally
    links:
      - text: Visit BEAM Bots
        url: https://beambots.dev/
      - text: Source on GitHub
        url: https://github.com/beam-bots/bb

  - key: phoenix
    name: Phoenix
    eyebrow: Phoenix · Web
    title: A web UI on the device itself
    text: Phoenix and LiveView give your device a real-time interface in the browser, served straight from the board. No separate frontend app and no cloud round trip.
    with_nerves: start from the `hello_live_view` example.
    links:
      - text: Phoenix docs
        url: https://hexdocs.pm/phoenix
      - text: Try the LiveView example
        url: https://github.com/nerves-project/nerves_examples/tree/main/hello_live_view
        icon: arrow

  - key: membrane
    name: Membrane
    eyebrow: Membrane · Media
    title: Cameras, audio and streams
    text: A framework for multimedia pipelines. Capture from a camera or microphone, transcode, and stream over WebRTC, RTSP or HLS, all from Elixir.
    with_nerves: smart cameras, intercoms and audio gadgets.
    pipeline: [Rpicam.Source, H264.Parser, WebRTC.Sink]
    links:
      - text: Membrane docs
        url: https://membrane.stream/
      - text: Demos and examples
        url: https://github.com/membraneframework/membrane_demo

  - key: nx
    name: Nx
    eyebrow: Machine learning
    title: Inference at the edge
    text: Numerical computing for Elixir. With Nx, Axon and Bumblebee you can run models for vision, audio and text right on the device.
    with_nerves: keep data on the device and decisions fast.
    note: computed on the device
    links:
      - text: Nx docs
        url: https://hexdocs.pm/nx
      - text: Bumblebee
        url: https://github.com/elixir-nx/bumblebee

upcoming:
  id: up-and-comers
  eyebrow: Up-and-comers
  title: Ones to watch
  aside: Newer projects from the community that we’re keeping a happy eye on.
  projects:
    - key: atomvm
      name: AtomVM
      kicker: AtomVM · For microcontrollers
      title: The BEAM, shrunk to fit a microcontroller
      text: A tiny Erlang VM for chips like the ESP32 and STM32. Run Erlang, Elixir and Gleam on boards where a full Linux system is more than the job needs.
      links:
        - text: atomvm.org
          url: https://atomvm.org/
    - key: emerge
      name: Emerge
      kicker: Emerge · Native GUI
      title: Native interfaces, declared in Elixir
      text: Describe layout and styling in one declarative tree. Components are plain functions that return UI, and the same renderer drives a desktop window or a display over DRM, Raspberry Pi with Nerves included.
      more: "**State lives outside the view.** Emerge pairs with [Solve](https://github.com/emerge-elixir/solve), which models the app as a graph of small state machines. Views subscribe to the state they need and rerender when it changes."
      links:
        - text: Emerge docs
          url: https://hexdocs.pm/emerge
        - text: Nerves demo
          url: https://github.com/emerge-elixir/nerves_emerge_demo

more:
  id: more-embedded-beam
  eyebrow: Beyond Nerves
  title: More embedded BEAM
  jump: More embedded BEAM
  aside: Other projects bringing Erlang and Elixir to hardware, each with its own take on the platform underneath.
  projects:
    - name: GRiSP
      kicker: Real-time OS
      image: img/related/grisp.png
      text: Erlang and Elixir on the RTEMS real-time operating system.
      link: https://www.grisp.org/
      link_text: grisp.org
    - name: KRY10 OS
      kicker: Microkernel
      image: img/related/kry10.png
      text: Elixir on the seL4 microkernel.
      link: https://www.kry10.com/
      link_text: kry10.com
    - name: meta-erlang
      kicker: Yocto layer
      image: img/related/meta-erlang-yocto.png
      text: A Yocto Project layer for Erlang and Elixir applications and libraries.
      link: https://meta-erlang.github.io/
      link_text: meta-erlang.github.io
  suggest:
    title: Know a project that belongs here?
    text: Suggest it with a pull request to the website.
    link: https://github.com/nerves-project/nerves-project.github.io
    link_text: Website on GitHub
---
