---
layout: learn
title: Nerves - Hello Network Demo
category: learn
---

# Hello Network Demo

The "Hello Network" demo shows off how to get a Nerves device connected to a network.

## Get the Code

If you didn't already download the `nerves-exaples` project for the [Blinky Demo](blinky-demo.html), do so now.

    git clone https://github.com/nerves-project/nerves-examples.git
    cd nerves-examples/hello_network

## Prepare Bakeware for your Target Hardware

Just like with the Blinky Demo, you'll want to take a look at how the code works.

If you didn't already, you'll also need to prepare Bakeware to compile for your target hardware.
Depending on what kind of target hardware you have, you will need to choose the correct `--target` setting:

| Raspberry Pi     | rpi  |
| Raspberry Pi 2   | rpi2 |
| Beaglebone Black | bbb  |

    bake system get --target rpi2
    bake toolchain get --target rpi2

When that's done, build your **Firmware**:

    bake firmware --target rpi2

You can **Burn** this file to an SD card like this:

    # On Mac OSX
    bake burn --target rpi2

    # On Linux (make sure you use the correct suffix for your target hardware)
    fwup -a -i _images/hello_network-rpi2 -t complete

Once it is done, put the SD card into your target hardware and power it on.
If you have a screen attached to the HDMI port, you will see Linux booting up.
After about four seconds, you will see the IP address leased from DHCP on the screen.

> TODO: Describe in more detail about how this works and what they should expect to see

Success!
