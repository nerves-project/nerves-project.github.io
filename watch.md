---
layout: default
title: Nerves talks and screencasts
category: watch
---

# Presentations

---

## The Joy of Connecting Elixir to the Physical World

Frank Hunleth's presentation at Elixir & Phoenix Conf 2016.

With all of the Python, Node.js and C++ libraries for connecting to sensors, actuators, and other devices, it's easy to dismiss Elixir as a language for physical computing. Nothing could be farther from the truth. Between binary pattern matching, a functional approach to transforming low level data, and natural support for recovering from the hiccups of real world hardware, Elixir is an ideal language. The main parts missing have been low level library support.

This talk starts with a discussion of the options for connecting to hardware devices, challenges and pitfalls of each technique, and tips for minimizing frustration. It will provide an in depth-view of using the `nerves_uart` library, your laptop, and an inexpensive FTDI cable to interact with sensors, motors, smart phones via Bluetooth LE, and more. Each example will show how Elixir can beautify some really ugly hardware interfaces. Finally, the talk will end with how to remove the tether to your laptop by creating standalone embedded devices with Nerves. [slides](https://speakerdeck.com/fhunleth/the-joy-of-connecting-elixir-to-the-physical-world)

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/SVy7gRU_-P8" frameborder="0" allowfullscreen></iframe>
</div>

---

## Nerves + Phoenix Saves a Father's Sanity!

Joel Byler's presentation at Elixir & Phoenix Conf 2016.

Recently I've been able to encourage my children to do their chores and not fight about it. Its been made possible with the help of Elixir and an Umbrella project which combines the use of Phoenix and Nerves (and some prototyping hardware) to build a chore system which rewards each kid with their own internet access after they've done their work for the day. It also makes it really easy to revoke access when they misbehave. In this talk I'll take you with me back through the journey, and I'll talk about why it was needed, what I learned, and how the the final outcome has saved my sanity. [slides](https://speakerdeck.com/joelbyler/nerves-plus-phoenix-saves-a-fathers-sanity)

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/cznxe3TCevk" frameborder="0" allowfullscreen></iframe>
</div>

---

## Building "learn to touch type" glove with Elixir and Arduino

Tetiana Dushenkivska's presentation at Elixir & Phoenix Conf 2016.

Knowledge-sharing about building "touch-typing glove" with Arduino and Elixir. This talk is about my journey from research, choosing tools, making flexible tiny pressure sensors, plugging them into Arduino, reading information from Arduino to the server running Elixir, and rendering result in the browser. [slides](https://speakerdeck.com/tetiana12345678/building-learn-to-touch-type-glove-with-elixir-and-arduino)

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/j_7kqFgIK-M" frameborder="0" allowfullscreen></iframe>
</div>

---

## Nerves: Connected beyond the Node
Justin Schneck's presentation at Elixir & Phoenix Conf 2016.

Nerves defines an entirely new way to build embedded systems with Elixir that is ready to revolutionize the industry. Embedded systems have never been easier to create using familiar tools and frameworks, and now we are making it even more connected. Together, we will explore new features in Nerves which make debugging your target even easier. Learn how to create stunning user interfaces for touchscreen displays using Phoenix. Perform ExUnit on your target device, and more. Join us to learn more about the exciting new features which makes Nerves a powerful and productive tool for creating amazing new products.

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/VhAIDmtKhO4" frameborder="0" allowfullscreen></iframe>
</div>

---

## Mixed Up with Nerves - My Journey So Far
Greg Mefford presents at the Cincinnati Elixir Meetup, giving an update on recent news from the Nerves team and community. He also talks about his experience getting involved with contributing to the Nerves project and subsequently joining as a core team member. [slides](https://github.com/GregMefford/presentations/tree/master/2016-07-05_mixed-up-with-nerves-my-journey-so-far)

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/YMVL4275Zog" frameborder="0" allowfullscreen></iframe>
</div>

---

## Enhanced Embedded Systems with Nerves
Justin Schneck presents at ElixirConfEU 2016, giving a detailed description of how to use Nerves with the new Mix integration to build robust firmware in Elixir, including a UI leveraging a Phoenix back-end also running on the device. [slides](http://s3.amazonaws.com/erlang-conferences-production/media/files/000/000/089/original/NervesRevolution.pdf)

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/118-g0ODfgg" frameborder="0" allowfullscreen></iframe>
</div>

---

## Nerves - Getting Started, and the Road Ahead
Garth Hitchens presents at Elixir Daze 2016, giving a detailed update his previous talk, **Embedded Elixir in Action**.
He describes the current state of the platform, libraries, and tooling around Nerves.
He also talks about the future integration with `mix`, upcoming support for network protocols, and plans for more robust, built-in security features.

<div class="video-container">
  <iframe src="//www.youtube.com/embed/poWoCWDLxRU" frameborder="0" allowfullscreen></iframe>
</div>

---

## Embedded Elixir / Introduction to Nerves
Justin Schneck discusses why Elixir is a great language for embedded development, gives us an update on the current state of the Nerves project. He also goes through a detailed demonstration of how to use Bakeware to build and deploy a Nerves app from a Mac.

<div class="video-container">
  <iframe src="//www.youtube.com/embed/V7SAb02PaUU" frameborder="0" allowfullscreen></iframe>
</div>

---

## Embedded Elixir with Nerves
Greg Mefford gives a brief overview of why Elixir and Nerves are a great platform for embedded developent, introduces the Nerves core team, and gives an update on the team's current short-term roadmap.
He describes how the tools in the Nerves ecosystem work together to build a firmware image and shows a whimsical demo, driving NeoPixels from a Raspberry Pi. [slides](http://slides.com/gregmefford/first_dose_of_embedded_elixir_with_nerves#/)

<div class="video-container">
  <iframe src="//www.youtube.com/embed/kJYHzxIh_Yc" frameborder="0" allowfullscreen></iframe>
</div>

---

## Embedded Elixir in Action
Presentation given by Garth Hitchens at ElixirConf in October, 2015.  Gives a good overview of Nerves, it's capabilities, and where it is going as a platform, as well as demonstrating it's capabilities

<div class="video-container">
  <iframe src="//www.youtube.com/embed/kpzQrFC55q4" frameborder="0" allowfullscreen></iframe>
</div>

---

## Getting Started with Nerves
Frank Hunleth describes how to use `nerves-sdk` (now renamed to `nerves-system-br`) to build cross-compiled
firmware written in erlang.  While we are working to dramatically simplify this
process with our `bake` tool, this is a good overview of how nerves
can be used today in linux to cross-compile Erlang and Elixir code.

<div class="video-container">
  <iframe src="//www.youtube.com/embed/kWXrct6nnGg" frameborder="0" allowfullscreen></iframe>
</div>

---

## Embedded Erlang, Nerves, and SumoBots
Slides from a presentation given by Frank Hunleth at Erlang Factory 2015 demonstrating using Nerves to drive SumoBots from a Raspberry Pi.

<div class="video-container">
  <iframe src="//www.slideshare.net/slideshow/embed_code/46381503" width="425"
  height="355" frameborder="0" marginwidth="0" marginheight="0" scrolling="no"
  style="border:1px solid #CCC; border-width:1px; margin-bottom:5px; max-width:
  100%;" allowfullscreen> </iframe> <div style="margin-bottom:5px"> <strong> <a
  href="//www.slideshare.net/fhunleth/embedded-erlang-nerves" title="Embedded
  Erlang, Nerves, and SumoBots" target="_blank">Embedded Erlang, Nerves, and
  SumoBots</a> </strong> from <strong><a href="//www.slideshare.net/fhunleth"
  target="_blank">Frank Hunleth</a></strong> </div>
</div>

---

## Building an IP Network Camera
Slides from a presentation given by Frank Hunleth at Erlang Factory 2014 demonstrating using Nerves to build an IP camera out of a BeagleBone Black.

<div class="video-container">
  <iframe src="http://www.slideshare.net/slideshow/embed_code/32062475"
  width="427" height="356" frameborder="0" marginwidth="0" marginheight="0"
  scrolling="no" style="border:1px solid #CCC; border-width:1px 1px 0;
  margin-bottom:5px; max-width: 100%;" allowfullscreen> </iframe> <div
  style="margin-bottom:5px"> <strong> <a
  href="https://www.slideshare.net/fhunleth/building-a-network-ip-camera-using-erlang"
  title="Building a Network IP Camera using Erlang" target="_blank">Building a
  Network IP Camera using Erlang</a> </strong> from <strong><a
  href="http://www.slideshare.net/fhunleth" target="_blank">Frank
  Hunleth</a></strong> </div>
</div>

---

## Using Erlang in an Embedded and Cross-Compiled World
Slides from a presentation given by Frank Hunleth to an Erlang users's group in Washington DC, 2013.  Describes the history of the nerves project and the motivation.

<div class="video-container">
  <iframe src="http://www.slideshare.net/slideshow/embed_code/29000661"
  width="420" height="315" frameborder="0" marginwidth="0" marginheight="0"
  scrolling="no" style="border:1px solid #CCC;border-width:1px 1px
  0;margin-bottom:5px" allowfullscreen> </iframe> <div style="margin-bottom:5px">
  <strong> <a href="https://www.slideshare.net/fhunleth/erlangdc-2013"
  title="Using Erlang in an Embedded and Cross-Compiled World"
  target="_blank">Using Erlang in an Embedded and Cross-Compiled World</a>
  </strong> from <strong><a href="http://www.slideshare.net/fhunleth"
  target="_blank">Frank Hunleth</a></strong> </div>
</div>

