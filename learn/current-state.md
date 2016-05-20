---
layout: learn
title: Nerves - Current status of the ecosystem
category: learn
---

# Current status of the ecosystem

## Hardware support

- ☑ GPIO/I2C/SPI
  - Supported via [Elixir/ALE](https://github.com/fhunleth/elixir_ale)
- ☑ UART/Serial
  - Supported via [Nerves.UART](https://github.com/nerves-project/nerves_uart)
- ☑ PWM
  - Some hardware platforms support PWM, currently it's not exposed via Elixir functions
- ☐ Persistent storage
  - Currently there is no Elixir wrapper
  - Can be done by re-mounting the data partition with write access (and possibly re-mounting again in read only mode)
- ☑ Audio Output
  - ALSA is supported by buildroot, check the [EV3](https://github.com/nerves-project/nerves_system_ev3) repo

## Networking

- ☑ Ethernet Networking
  - Supported via [Nerves.Networking](https://github.com/nerves-project/nerves_networking)
- ☑ Wifi Networking
  - https://github.com/nerves-project/nerves_wifi

## Embedded development

- ☑ [Mix integration](https://hexdocs.pm/nerves/getting-started.html#making-firmware)
- ☐ Remote Firmware Upgrade
  - Currently in development, works by sending firmware via HTTP POST: [https://github.com/ghitchens/nerves_firmware](https://github.com/ghitchens/nerves_firmware)
- ☑ Auto Discovery
  - SSDP is officially supported via [Nerves.SSDPServer](https://github.com/nerves-project/nerves_ssdp_server) and [Nerves.SSDPClient](https://github.com/nerves-project/nerves_ssdp_client)
- ☑ Key-Value Store
  - Supported via [Nerves.Hub](https://github.com/nerves-project/nerves_hub)
- ☑ HTTP Client
  - Feel free to use your go-to HTTP client

## User interface

- ☑ HTTP Server
  - You can use your normal HTTP Servers on Nerves - or a fully fledged framework like [Phoenix](http://www.phoenixframework.org/)
- ☐ Display Output
- ☐ HTML Rendering
  - Due to the lack of display output this doesn't work
- ☐ Video Rendering
  - Due to the lack of display output this doesn't work
