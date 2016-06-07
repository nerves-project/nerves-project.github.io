---
layout: post
title: Baking firmware on Mac OS X
author: Garth Hitchens
category: news

---

> NOTE: As of June 2016, Bake is no longer the best way to build firmware with Nerves. Check out [this news update](http://nerves-project.org/news/2016/05/29/a-whirlwind-of-recent-changes/#mix-integration) for more details on the native Mix integration for Nerves.

The core team has been quietly but diligently working on simplifying one of the most frustrating parts of getting started with Nerves: the build process.  And we're ready for you to give what we've done a spin.

When I gave the [Embedded Elixir in Action](https://www.youtube.com/watch?v=kpzQrFC55q4) talk in October, building your Nerves firmware always involved running a cross compiler under Linux.  It was one of the most frustrating parts of Nerves -- you had to run Linux in a virtual machine in order to do compiles, because the toolchains only worked on Linux, not on OS X or Windows.

During that talk, I mentioned that we were working on a service that would simplify building your firmware by using a cloud-hosted Linux VM to cross-compile your application, and return the resulting firmware to you.   I demonstrated a prototype of that system at the conference.  A number of you have been anxiously awaiting that system.  

__I'm so happy to say that system never got implemented.__

Instead, Frank and Justin came up with something far better, something I never anticipated.  We now have the ability to cross compile your application and assemble your firmware entirely on your Mac under OS X.   It really does work, and it's smooth as silk.      

One of the magic ingredients is that we now pre-build __toolchains__ (cross compilers and tools) for OS X, allowing you to desktop compile code for the architecture of your target device (Raspbery PI, Beaglebone, Galileo, etc).

All of this would take forever if you needed to compile the linux-based nerves platform for every application, so we also provide precompiled __systems__ for each target, so all that is needed to produce firmware is to compile your application and dependencies, and __assemble__ it with one of these pre-built systems on your local machine.

We don't have support for doing this under Windows yet -- it's been a bit harder, but we expect to use the same strategy to get builds under Windows working before too long.

## Introducing Bake

Obtaining the proper systems, toolchains, dependencies, and assembling firmware for a particular target involves a lot of moving parts.   It gets even harder if you want your application to be able to work on multiple target devices.

Justin has been working hard on a tool called `bake` to manage all of this, and it's now ready for your use.  You can think of `bake` as the master build tool for Nerves.    Bake does a lot of things:

- gets toolchains and systems needed to build firmware for a target
- manages "locking" of versions of toolchains and systems
- sets up and manages the cross compile environment during builds
- manages recipes (specifications for building a custom system)
- simplifies the build and firmware burn process

In the future it will do even more -- manage server-side builds of custom systems from recipes, and sharing recipes, but those pieces aren't done yet.   What is done, however, is what most of us need now -- the ability to get started building firmware easily.

Let's say we have a nerves project that we want to deploy on the Raspberry Pi or Pi2, or the Galileo.  In the root directory of your app, you create a `Bakefile` that looks something like this:

```elixir
use Bake.Config

platform :nerves
default_target :rpi2    # optional

target :rpi,  recipe: {"nerves/rpi", "~> 0.1"}
target :rpi2, recipe: {"nerves/rpi2", "~> 0.1"}
target :galileo, recipe: {"nerves/galileo", "~> 0.1"}
```

Given that, can simply do:

```sh
$ bake system get
$ bake toolchain get
$ bake firmware
```

That's all there is to it.   Your firmware is ready to burn.   Ok, not all there is, there's actually much more, but that's enough for now to whet your appetite.  Interested?  Check out the [bake README](https://github.com/bakeware/bake).
