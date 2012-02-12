---
layout: page
title: Getting Started
group: navigation
---
{% include JB/setup %}

These instructions assume that you have a BeagleBone. If not, see [Buy
a BeagleBone](http://beagleboard.org/buy). After that, follow the
instructions below:

1. Install drivers on your host PC to be able to access the BeagleBone
through USB. See the [BeagleBone driver setup
instructions](http://beagleboard.org/static/beaglebone/a3/README.htm#drivers).
2. Download the latest MicroSD image from the [project's github download
page](https://github.com/nerves-project/bbone-erlang-buildroot/downloads).
3. Unzip the image and copy it to the MicroSD card. The instructions
vary depending on OS. On Linux, run `sudo dd if=bbone-erlang-x.y.img
of=/dev/sdX bs=128k` where sdX is the MicroSD device. Some help can be
found for Windows on the [BeagleBone wiki](http://circuitco.com/support/index.php?title=BeagleBone#Image_Files).
4. Insert the MicroSD card into the BeagleBone and boot.
5. Log into the board via the console. Log in as `root` with no
password.

## Board Notes

Working on an embedded Linux board is different from working on a PC.
The Erlang image for the BeagleBone is no exception. Below are some
differences:

1. The root filesystem is mounted read-only. This means that you can't
just update a file in /etc by just editing it. However, mounting the
root filesystem read-only improves the robustness of the device through
ungraceful shutdowns. For minor modifications, run `mount -o remount,rw
/`, but be sure to modify the Buildroot configuration when making a
change. This way, no changes are forgotten. If you need to write data to
storage, write to the /mnt/user directory.
2. Almost everything is done as root. While this isn't necessary, many
embedded Linux devices operate this way. When so much processing
requires root privileges anyway in an embedded Linux system, it is just
easier to log in as root. The default user exists in the image for
clients who ssh into the BeagleBone.
3. There is no package manager. This is true for Buildroot embedded
Linux systems. Buildroot manages package selection through `make
menuconfig`. While this may seem time consuming at first, the simplicity
and repeatability of Buildroot are nice to have in a system. Plus the
images are small since they contain very little unused code.

