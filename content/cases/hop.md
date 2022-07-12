---
title: Using Nerves to Build a Facial Recognition-Powered Beer Kiosk System at Hop
date: 2022-01-02
tags:
  - case
---

Hop used Nerves to build the world's first self-serve beer kiosk powered by
facial recognition technology.

<!--more-->

## The Concept

Hop is the world’s first beer kiosk to use automated facial recognition to
verify identification, allowing users to purchase beer by the ounce and pour it
themselves. Las Vegas-based Adult Beverage Co. (ABC) engaged Very, an IoT
development firm and Nerves sponsor, to build the proprietary software and
hardware that powers Hop, which made its debut on the Vegas Strip. Very used the
Nerves Project and NervesHub to build Hop’s robust kiosk system and support the
devices that make the transactions possible.

Hop asks first-time users to enter basic personal information, scan an image of
their legal ID, take a few facial recognition reference photos, and swipe their
credit card. When pouring a beer, a photo is taken at the tap and compared to
the user’s reference images, giving a match rating out of 100%.

A bartender onsite reviews the rating and approves or denies service. On future
visits, customers will be automatically recognized — which means all they have
to do is approach the kiosk, choose a tap, and pour their beer.

![](/nerves_website/img/Hop-case-1.png)
![](/nerves_website/img/Hop-case-2.jpg)

## How Nerves Helped — IoT Prototyping & Hardware

The product that ABC envisioned required complex hardware-software interactions.
While they had a working product that was up and running, it was difficult to
use and incredibly buggy. What’s more: critical portions of their software and
hardware were purchased from an inflexible third party vendor, which meant
that it couldn’t be customized to meet the needs of the product or the
business as a whole.

Very began the project with a technical audit of ABC’s existing hardware and
software to understand what was working and what needed improvement. While the
system’s hardware was functioning, they identified a range of improvements
that would enhance product performance.

To make those improvements, Very chose the Nerves Project because of the ways
Nerves brings agility to the IoT development cycle. For example, Nerves enables:

- Seamless test-driven development including peripheral/sensor emulation. This
  eliminates slow hardware-in-the-loop testing on every iteration and often
  yields software that works the very first time it touches the embedded target.
- Continuous delivery of tested firmware builds via common continuous delivery
  tools designed for the web.
- Many compatible open-source tools for secure communication with web servers
  via HTTP and WebSockets.
- Fault-tolerant and automated OTA firmware updates.
- Applications that are tolerant to hardware failures/abnormalities like
  accidental shorts.

While Nerves is compatible with whichever embedded languages your project is
already written in (like C, C++, Python, or Rust), Very chose to use Elixir
with Nerves for the Hop project because it is the language that most Nerves
tools are written in and it is prevalent in the web development space. This
made it possible for their web programmers to work quickly and easily in an
embedded environment.

Very used Nerves to:

- Develop firmware for the IoT-powered devices
- Move to a cloud-managed approach for managing all tap screens and hardware connections
- Implement rolling updates to all deployed hardware
- Enable real-time interaction between the hardware and software

## The Results

The new Hop system performs exactly the way ABC envisioned and has the potential
to scale seamlessly.

Hop makes the beer-buying process fast and seamless for thirsty tourists. For
vendors, it eliminates waste (as it charges by the ounce poured, not the glass)
and allows for easy inventory analysis. The Vegas Strip was a natural location
for a pilot due to its open-container policy and the high volume of foot
traffic, but Hop has countless potential applications — like event venues,
stadiums, and restaurants — which ABC plans to leverage in the near future.
