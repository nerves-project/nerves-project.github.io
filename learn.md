---
layout: default
title: nerves
category: learn
---

<center>
# learn
</center>
<hr/>

> __IMPORTANT__ -- In September 2015, the nerves project dramatically expanded to include the charter and members of the former [cellulose](http://cellulose.io) project.  This change involved an increase in focus on the [Elixir](http://elixir-lang.org) language, a broader scope encompassing an embedded framework and tooling, as well as more than doubling the size of the core team.
>
> Unfortunately, the documentation we have available at this time does not yet reflect these changes, and we are diligently working to update it.  We hope to have some better overview material by year's end.
>
> The documentation below reflects how to use the nerves-sdk (foundation) to build firmware in either Erlang or Elixir.   The methods require linux or a linux VM, which we hope to alleviate soon.   We haven't delivered yet on our ease-of-getting-going goal, but we're very close.

> In the meantime, if you are very hearty and interested in helping us craft nerves, contact us on the __#nerves__ channel in the [elixir-lang slack community](https://elixir-slackin.herokuapp.com/) or 
> contact us on the [mailing list](https://groups.google.com/group/nerves-project).

<hr/><br/>
# Architectural Overview

Write your firmware using Elixir or Erlang, and use popular build
tools like [Rebar](https://github.com/basho/rebar), [Mix](http://elixir-lang.org/getting-started/mix-otp/introduction-to-mix.html), [Relx](https://github.com/erlware/relx) or [Exrm](https://github.com/bitwalker/exrm)
a cross-compiled environment for targeting small to medium sized
embedded devices. Releases are packaged into bootable all-in-one firmware
images. [Buildroot](http://buildroot.net/) provides the base images and simplifies
cross-compilation of external C/C++ libraries needed for your application.

The Nerves project sets up your environment and provides the base images so that you
can do this:

![Alt Diagram of Nerves](images/nerves-summary.png)

## For C/C++ Embedded Software Developers

[Elixir](http://elixir-lang.org) and [Erlang](http://www.erlang.org/) provide higher level programming environments that have been used to build massively scalable soft real-time systems with requirements on high availability (5-9's). The underlying BEAM VM system has built-in support for concurrency, distribution and fault tolerance.

It is quite common to interface with C and C++ code in Erlang to
handle performance critical or low level code or just to integrate
with existing libraries. Erlang can even supervise your C and C++
code so that crashes and failures can be handled and isolated
from the rest of your code.

The Nerves Project uses the Linux kernel to provide the devices drivers
needed for your embedded system. The kernel can be configured using
Buildroot to trim down the size of your firmware image if necessary.

Since so much of what the standard Linux userland provides can be
accomplished via Erlang libraries, very few userland tools are
actually needed. In fact, Nerves replaces _init_ with a small C
program that boots the Erlang runtime directly and lets Erlang
control initialization. The standard Erlang release tools ensure
that only the Erlang libraries that you need are included.

## For Elixir or Erlang Developers

Nerves provides a cross-compiled environment that is focused on creating small,
self-contained packages for easy distribution and use on target hardware. The
alternative is to develop on device, and this route can be very convenient
and easy. See [Erlang Embedded](http://www.erlang-embedded.com/)
for pre-built packages for your environment. However, developing on device
may not be an option if the target is not powerful enough, and it also doesn't
provide the tools and infrastructure for packaging code for manufacture.
The Nerves Project aims to provide this infrastructure so that Erlang and
to make the cross-compiled environment a natural one for development.


# Getting Started 
The first step is downloading and installing the [Nerves
SDK](https://github.com/nerves-project/nerves-sdk) from GitHub. See the
[README.md](https://github.com/nerves-project/nerves-sdk/blob/master/README.md)
for instructions.

Once the Nerves SDK has been installed, you can start your own Erlang projects
and build them in the Nerves environment. Look at the [demonstration
project](https://github.com/nerves-project/nerves-demo) for
a simple example. The Getting Started screencast below walks through the SDK
installation and the demo application build step by step.

<iframe width="420" height="315" src="//www.youtube.com/embed/kWXrct6nnGg"
frameborder="0" allowfullscreen>
</iframe>

# Components & Tools

> This section is dated and does not reflect current componentry and tooling.  

### [fwup](https://github.com/fhunleth/fwup)


The fwup utility is a configurable image-based firmware update utility for embedded Linux-based systems. It has two modes of operation. The first mode creates compressed archives containing root file system images, bootloaders, and other image material. These can be distributed via websites, email or update servers. The second mode applies the firmware images in a robust and repeatable way. 

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

> Note: deprecated, functionality now included in fwup

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

### Where did my Ethernet go?

Nerves comes up very barebones. This is supposed to be a feature, but it can
make getting started more difficult. If you have wired Ethernet on your
platform, the steps are as follows: (Works on BeagleBone Black and Raspberry Pi
Model B and B+)

    os:cmd("/sbin/ip link set eth0 up").
    os:cmd("/sbin/ip addr add 192.168.1.40/24 dev eth0").
    os:cmd("/sbin/ip route add default via 192.168.1.1").

If you're using Elixir, the corresponding commands are:

    :os.cmd('/sbin/ip link set eth0 up')
    :os.cmd('/sbin/ip addr add 192.168.1.40/24 dev eth0')
    :os.cmd('/sbin/ip route add default via 192.168.1.1')

### I like Elixir. How can I switch the shell to iex?

First, make sure the `iex` is included in your project's release. See the
`relx.config` in the [nerves-elixir_trivial project](https://github.com/fhunleth/nerves-elixir-trivial)
for an example. Double check your project's release directory to make sure that
the beam files for iex are included.

The second step is to update the `vm.args` to have the following options:

    -noshell
    -user Elixir.IEx.CLI
    -extra --no-halt

If you don't have a `vm.args`, create one and make sure that it gets included in
your project's OTP release directory.

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

