---
layout: learn
title: Nerves - Current status of the ecosystem
category: learn
---

# Current status of the ecosystem

## Level 1

##### Basic building blocks for hardware integration

- ☑ GPIO
  - Supported via [Elixir/ALE](https://github.com/fhunleth/elixir_ale)
- ☑ UART/Serial
  - Supported via [Nerves.UART](https://github.com/nerves-project/nerves_uart)
- ☑ PWM
  - Some hardware platforms support PWM, currently it's not exposed via Elixir functions
- ☑ I2C/SPI
  - Supported via [Elixir/ALE](https://github.com/fhunleth/elixir_ale)
- ☑ Ethernet Networking
  - Supported via [Nerves.Networking](https://github.com/nerves-project/nerves_networking)
- ☑ Wifi Networking
  - https://github.com/nerves-project/nerves_wifi
- ☐ Persistent storage on SD Card
  - Currently there is no Elixir wrapper
  - Can be done by re-mounting the data partition with write access (and possibly re-mounting again in read only mode)
- ☐ Display Output
- ☐ Audio Output


## Level 2

##### More convenient development of embedded projects

- ☐ Remote Firmware Upgrade
  - Currently in development, works by sending firmware via HTTP POST: [https://github.com/ghitchens/nerves_firmware](https://github.com/ghitchens/nerves_firmware)
- ☑ Auto Discovery
  - SSDP is officially supported via [Nerves.SSDPServer](https://github.com/nerves-project/nerves_ssdp_server) and [Nerves.SSDPClient](https://github.com/nerves-project/nerves_ssdp_client)
- ☑ Key-Value Store
  - Supported via [Nerves.Hub](https://github.com/nerves-project/nerves_hub)
- ☑ HTTP Server
  - You can use your normal HTTP Servers on Nerves - or a fully fledged framework like [Phoenix](http://www.phoenixframework.org/)
- ☑ HTTP Client
  - Just as with servers, feel free to use your go-to HTTP client

## Level 3

##### High level abstractions / applications

- ☐ HTML Rendering
  - Due to the lack of display output this doesn't work
- ☐ Video Rendering
  - Due to the lack of display output this doesn't work
