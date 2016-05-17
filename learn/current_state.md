---
layout: learn
title: Nerves - Current status of the ecosystem
category: learn
---

# Current status of the ecosystem

## Level 1

##### Basic building blocks for hardware integration

- ☑ GPIO
  - https://github.com/fhunleth/elixir_ale
- ☑ UART/Serial
  - https://github.com/nerves-project/nerves_uart
- ☑ PWM
  - Some hardware platforms support PWM, currently it's not exposed via Elixir functions
- ☑ I2C
  - https://github.com/fhunleth/elixir_ale
- ☑ Ethernet Networking
  - https://github.com/nerves-project/nerves_networking
- ☑ Wifi Networking
  - https://github.com/nerves-project/nerves_wifi
- ☐ Display Output

## Level 2

##### More convenient development of embedded projects

- Remote Firmware Upgrade
  - Currently in development, works by sending firmware via HTTP POST: https://github.com/ghitchens/nerves_firmware
- Auto Discovery
- Key-Value Store
- HTTP Server
  - You can use your normal HTTP Servers on Nerves - or a fully fledged framework like Phoenix
- HTTP Client
  - Just as with servers, feel free to use your go-to HTTP client

## Level 3

##### High level abstractions / applications

- HTML Rendering
- Video Rendering
