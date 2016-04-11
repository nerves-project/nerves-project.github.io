---
layout: learn
title: nerves
category: learn
---

# Learning about Nerves

We're excited that you're interested in using Nerves!
That's why we've put together these learning modules to help you be successful as quickly as possible.

Nerves is focused on simplifying the process of creating firmware for embedded systems using the [Elixir](http://elixir-lang.org) programming language.
If you're not already familiar with Elixir, you can still get started with Nerves, but you'll soon want to learn more about it.

Elixir provides a higher-level programming environment than C and C++, which are commonly used for embedded programming.
The underlying Erlang BEAM VM, on which Elixir code runs, is very mature and has been used to build massively scalable soft real-time systems with high availability (5-9s).
It also has built-in support for concurrency, distribution and fault tolerance.
All around, it is a great choice for use in embedded systems.

Nerves also supports other BEAM languages like [Erlang](https://www.erlang.org/) and [Lisp-Flavored Erlang](http://lfe.io/), but those wont be specifically covered here.

## Overview of the Nerves Ecosystem

If you're just getting started with Nerves, we think you'll probably want to start with a visual summary of the tools you'll be using and learning more about.
Don't worry if it doesn't all sink in right away, just skim over it so you have some context before the **Getting Started** section.

![Overview of Nerves Components](/images/nerves_overview.png)

### [Bakeware](http://www.bakeware.io/)

To compile firmware and burn it to an SD card, you'll likely only need to interact with Bakeware's `bake` command, which takes care of all the details.
Bakeware has a concept of a **Toolchain**, which is a set of compilers, libraries, and tools that build code for a particular target (e.g. Raspberry Pi).
It also has a concept of a **System**, which is pre-built base file system image for the target hardware, using the specified **Toolchain**.
After downloading these two items, your application code is built using the same **Toolchain** as was used to build the pre-compiled **System** image.

### [fwup](https://github.com/fhunleth/fwup)

The fwup utility is a configurable image-based firmware update utility for embedded Linux-based systems.
It has two modes of operation:

  1. Create compressed firmware archives for distribution via websites, email or update servers
  2. Apply firmware images in a robust and repeatable way

### [nerves-system-br](https://github.com/nerves-project/nerves-system-br)

Nerves uses Buildroot to produce a Linux kernel that provides the devices drivers needed for your embedded system.
This is also where the tool-chains are configured to [cross-compile](https://en.wikipedia.org/wiki/Cross_compiler) your code for your target hardware.
Bakeware uses this behind the scenes, but you may need to use it directly to support custom device drivers, for example.

### [erlinit](https://github.com/nerves-project/erlinit)

Much of what the standard Linux userland provides can be accomplished via Erlang libraries, so Nerves replaces `sbin/init` with this small C program that boots the BEAM VM and launches an Erlang/OTP release on system boot.
The standard Erlang release tools ensure that only the libraries you need are included, keeping your firmware compact.

## Getting Started

The **Getting Started** modules teach you the basics of building firmware using the [Elixir](http://www.elixir-lang.org) programming language and deploying it to hardware like the [Rapsberry Pi](https://raspberrypi.org) and [BeagleBone Black](http://beagleboard.org/BLACK).
They're designed as a series of small achievements so that you can make progress and learn at your own pace, even if your schedule doesn't allow large blocks of focused time.
We recommend that you go through each of the modules in order to ensure everything works smoothly.

> Sorry! Many of these guides are still just place-holders.
> If you're looking for a way to contribute, we'd love for you to write one of these!

  1. [Prepare your Tools](prepare.html)
  1. [Pre-Built Demo Firmware](pre-built-demo.html)
  1. [The Blinky Demo](blinky-demo.html)
  1. [The Hello Network Demo](network-demo.html)
  1. [Your First Nerves Project](first-project.html)
  1. [Elixir/OTP Crash-Course](elixir-otp-crash-course.html)

## How Do I...

The **How Do I...** modules go deeper into the details of how to interface with particular hardware you may have.
Even if you're already familiar with Elixir, some things will be different when you're working in an embedded environment, like testing.
There will be some modules in this section to help bridge those gaps.

> Sorry! All of these guides are still just place-holders.
> If you're looking for a way to contribute, we'd love for you to write one of these!

  1. Test Code that Depends on Hardware or Drivers
  1. Connect to an Ethernet Network (wired and wireless)
  1. Use Phoenix as an Embedded Web Server
  1. Use Sqlite as an Embedded Database
  1. Interface with I2C Hardware
  1. Interface with SPI Hardware
  1. Interface with a Serial Port
  1. Interface with Servos
  1. Interface with the Raspberry Pi Camera
  1. Interface with the Raspberry Pi Sense Hat
  1. Interface with WS2812B "NeoPixel" LEDs
  1. Drive a Video Display
  1. Use Erlang Distribution

<hr/>

> The content that follows is dated and may not reflect the current status of the Nerves Project

## Frequently-Asked Questions

### What license does Nerves use?

Nerves is split up into multiple projects with varying licenses. Nerves project
code that is written in Erlang or Elixir is covered by the
[Apache 2.0 license](https://opensource.org/licenses/Apache-2.0) or [MIT
license](https://opensource.org/licenses/MIT). The `nerves-system-br` component
contains scripts used for building C/C++ code that runs on the target. It
uses [Buildroot](http://buildroot.net/). Both it and Buildroot are covered by
the [GPLv2 license](https://opensource.org/licenses/GPL-2.0). While neither
project contains code that runs on the target, they both build code for the
target such as the Linux kernel, Erlang, and some utilities. Depending on your
Nerves system configuration, other packages may be included. To get the full
list, run `make legal-info`. Consult the Buildroot documentation for more
information.

### I need to make changes to Buildroot, but it takes so long to build.

Buildroot does a lot, so it's not surprising that it takes so long to build.
There are many ways to make it run faster, though.

   1. Create a ~/dl directory for caching downloads. I have the Nerves Makefile
      automatically look for this directory and setup Buildroot to use it.
      Caching downloaded files can take reduce the pain of waiting for downloads
      from slow websites.
   2. Enable CCache. This caches object files so that recompiles can be done
      lightning fast. Run `make menuconfig` and go to `Build options` and
      `Enable compiler cache`. I don't select it automatically since it can use
      a lot of disk space, but it's generally safe.
   3. Run on a native Linux install. Running in a VM is ok, but I've had a
      better experience natively booting Linux.
   4. Build on an SSD. Doing this significantly improved my experience with
      Buildroot.
   5. If you're porting Nerves to a new platform, try using an external
      toolchain rather than the default Buildroot toolchain. The default
      toolchain builds gcc which takes a very long time. External toolchains
      just need to be downloaded.

### How do I power off and reboot the board and what happens?

When the Erlang VM exits, the board is rebooted. This is done automatically
since it is expected that applications are long running and that an exit is most
likely a mistake. Of course, if you intentionally want to reboot the board, you
can always invoke `init:stop/0`.

The standard way of rebooting or powering off, though, is to send Unix signals
to the init process. In Nerves, the init process is `erlinit`. It behaves
similar to standard init implementations except that its behavior is not
configurable. When it gets signalled, it sends SIGTERM to all OS processes and then
sends SIGKILL to any that remain after a second. After processes are killed, a
best effort attempt to sync and unmount filesystems is made before rebooting or
shutting down for real. Sending `SIGUSR1` to `erlinit` (OS PID 1) halts the processor,
`SIGTERM` reboots, and `SIGUSR2` powers off.  The `poweroff`, `halt` and
`reboot` command line utilities will send these signals, so if you run
`os:cmd("poweroff")`, it will do the right thing.

### How does Nerves handle logging?

Nerves doesn't specify how you should handle logging in your application, but
many people use [Lager](https://github.com/basho/lager). The Nerves view of the
world is that Erlang is at the center of the world, and that the Linux kernel
and userspace hold supporting roles. A consequence of this is that you should
configure Lager to do the logging rather than hand it off to its syslog backend.
To log kernel messages and any other code that logs to syslog, see the
[l2elog](https://github.com/fhunleth/l2elog) project.

### Where did all of Elixir's pretty ANSI colors go?

They just need to be enabled. When you run `iex` on your host, it will check if
you're in an interactive session and enable the colors. Nerves skips the `iex`
startup script so this check gets skipped. To enable the colors, add the
following to your `sys.config`:

    {elixir, [{ansi_enabled, true}]}

