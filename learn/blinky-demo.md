---
layout: learn
title: Nerves - Blinky Demo
category: learn
---

# Blinky Demo

The "Hello World" of embedded software is often considered to be blinking an LED.
It proves that your hardware is working and that you have actually written code that properly controls it.

## Get the Code

    git clone https://github.com/nerves-project/nerves-examples.git
    cd nerves-examples/blinky

## Prepare Bakeware for your Target Hardware

Once you have the example code, take a minute to look at how it works.
When you're done, you'll need to prepare Bakeware and then tell it to create your firmware image.

Depending on what kind of target hardware you have, you will need to choose the correct `--target` setting:

| Raspberry Pi     | rpi  |
| Raspberry Pi 2   | rpi2 |
| Beaglebone Black | bbb  |

    bake system get --target rpi2
    bake toolchain get --target rpi2
    bake firmware --target rpi2

This will result in a **Firmware** file with a `.fw` extention being created.
You can **Burn** this file to an SD card like this:

    # On Mac OSX
    bake burn --target rpi2

    # On Linux (make sure you use the correct suffix for your target hardware)
    fwup -a -i _images/blinky-rpi2 -t complete

Once it is done, put the SD card into your target hardware and power it on.
If you have a screen attached to the HDMI port, you will see Linux booting up.
After about four seconds, you will see the on-board LED blinking on and off forever.

Success!
