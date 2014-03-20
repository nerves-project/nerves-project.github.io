---
layout: default
title: Nerves-Project
category: docs
---

# Documentation

The Nerves Project contains several subprojects and collects them all
together into the [Nerves SDK](https://github.com/nerves-project/nerves-sdk).
Top level documentation for each of the projects is maintained in the
`README.md` files. This page provides an overview of the subprojects.

### [fwtool](https://github.com/nerves-project/fwtool)

This project is a commandline application that combines the root file system,
bootloaders, and other configuration produced by the Nerves SDK into a set
of firmware images. The main one of these images (extension .img) is suitable
for copying to an SDCard (ala `dd if=sdcard.img of=/dev/sdc bs=1M`). The
second image (extension .fw) is a zip-compressed file that contains
instructions for how to upgrade a running system. This is different from
the in-place upgrades provided by Erlang/OTP in that this upgrade requires
a reboot to take effect. However, this file can be used to upgrade the
Linux kernel and system libraries as well as Erlang code.

### [erlinit](https://github.com/nerves-project/erlinit)

Erlinit is a replacement for `/sbin/init` that launches an Erlang/OTP release
on system boot. It provides the minimum system configuration needed to run
Erlang and can be thought of as a simple Erlang/OTP release start script.

Keep in mind that while Nerves uses the Linux kernel, it uses very few of the
standard Linux command line programs. This is usually not a problem since
Erlang provides much of the missing functionality internally. For system
initialization, the release creation tool `relx` generates a boot script that
tells the Erlang VM how load and start the Erlang applications that initialize
the system.

### [relsync](https://github.com/fhunleth/relsync)

The `relsync` tool is used in development to copy over code and data updates to
the remote target. The tool only copies the files that have changed so updates
are quick. `Relsync` will automatically reload changed beam files. Port
executables, libraries, and other priv directory contents are copied, but
`relsync` can't force their upgrade. For that, it is possible to pass a script
that `relsync` will invoke on the target before and after the synchronization
process.

### [mmccopy](https://github.com/fhunleth/mmccopy)

This tool is a replacement for `dd` for copying firmware images or other data
directly to SDCards and Flash memory. It provides numerous features such as
automatic SDCard device detection, efficient data copying, and progress
reporting. Ultimately, it is needed on Nerves target hardware for updating
images on device since Erlang does not allow file reads and writes to device
files. See [Erlang Faq 9.12](http://www.erlang.org/faq/problems.html#id56464).

## Nerves Project FAQ

### What license does Nerves use?

The Nerves SDK is covered by the [GPLv2 (or later)](http://www.gnu.org/licenses/old-licenses/gpl-2.0.html)
as a consequence of using [Buildroot](http://buildroot.net/). The licenses for
all of the code built in the SDK can be found by running `make legal-info` in
the `buildroot` subdirectory of the SDK.

Each Nerves subproject contains its license as part of the project. In most
cases the license is the [MIT License](http://opensource.org/licenses/MIT).

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
