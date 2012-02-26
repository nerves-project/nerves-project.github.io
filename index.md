---
layout: page
title: Erlang/OTP on the BeagleBone
---
{% include JB/setup %}

## What is Erlang?

[Erlang](http://www.erlang.org/) is a programming language used to
build massively scalable soft real-time systems with requirements on
high availability (5-9's). Some of its uses are in telecoms, banking,
e-commerce, computer telephony and instant messaging. Erlang's runtime
system has built-in support for concurrency, distribution and fault
tolerance.

## What is OTP?

OTP is a set of Erlang libraries and design principles providing
middle-ware to develop these systems. It includes its own distributed
database, applications to interface towards other languages, debugging
and release handling tools.

## What is the Nerves Project?

The Nerves project provides an embedded Linux-based environment for
running Erlang and an easy-to-use API to access common
I/O interfaces.

If you are interested in running an Erlang node on a low power
ARM-based board this project can get you started.

We are initially developing on the
[BeagleBone](http://beagleboard.org/bone), which provides both low
cost and high functionality.

## Current Features

1. Ready to use MicroSD card image to quickly get started using Erlang on the BeagleBone
2. Easy kernel and system package configuration using Buildroot
3. Configurable and subsettable compilation of Erlang/OTP to minimize system footprint
4. HiPE support (Experimental)
5. Configurable system installation of popular Erlang libraries such as Mochiweb
5. Open source development for all components

