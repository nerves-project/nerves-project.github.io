---
layout: default
title: Nerves talks and screencasts
category: watch
---

# Presentations

---

## Dadgineering with Elixir+Nerves

Jon Carsten's presentation at Empex 2019.

Are you a parent of children, pets, or just really immature roommates? Do you wish you could use Elixir to help solve household issues and annoyances? Do you frequently over-engineer side projects? Then you might be a dadgineer (or momgineer).

This talk is compilation of fun projects using Elixir & Nerves to solve silly problems around my home. Projects such as a "Picture Board Turn Selector" to programmatically answer the age old question of "Whose turn is it!?", complete with LED light show. Or hardening the security of the toy storage room with electromagnetic latching and biometric unlocking procedure.

The projects are overly complex for the problems they are solving, but my hope is that it helps inspire others to break into the world of hardware. To provide yet another set of wild examples to show how fun and sometimes surprisingly easy it is to create your own customizations in the physical world.

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/SJc4YYYloTQ" frameborder="0" allowfullscreen></iframe>
</div>

---

## Building a Smart Sprinkler Controller with Nerves

Todd Resudek's presentation at Lonestar ElixirConf 2019.

Smart sprinklers controllers can cost $200 or more and there is no way to customize them. For around $50 you can build your own sprinkler controller with Nerves and have the freedom to customize it in any way you want. I will walk you through the software and hardware you need to get going, including sensors that can make your controller smarter than any available off-the-shelf today.

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/qklciKp7sD8" frameborder="0" allowfullscreen></iframe>
</div>

---

## Five Easy Ways To Start With Nerves

Michael Ries' presentation at Empex LA 2019.

Some simple projects to get started with using Nerves.

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/BfWac2y7cJM" frameborder="0" allowfullscreen></iframe>
</div>

---

## Physical Elixir

Justin Schneck's presentation at The Big Elixir 2018.

Invention has always been fueled by the need to conquer the physical world by making repetitive, time-consuming tasks easier or automated. The wheel permanently changed the workload of human kind and the web has followed suit. In the infancy of internet connectivity, our focus has been on solving informational problems.

In a post-internet connected world, our problem solving must naturally progress back to the physical world. Our new physical frontier is not limited to large-scale problems of industry alone. Technology has afforded us the opportunity to solve small-scale problems for the individual with mastery and efficiency previously only available to industry.

It is time to make the personal wheel. In this talk we will look at what it means to create production ready devices through a series of examples. First we will explore how to use Nerves to model and automate tasks around your home or office. Next we will see how Nerves is used to help companies build innovative products. Finally, we will model and build a device in a live demo.

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/ZxDYdayfOS0" frameborder="0" allowfullscreen></iframe>
</div>

---

## My first Nerves Project: Bioreactor

David Schainker's presentation at ElixirConf 2018.

Living in a vibrant Asian city can have its downsides, especially with regards to air quality. While buying the Latest and Greatest IoIT air filter can help with particulate matter in the air, there is little help with increased CO2 levels in your home, except installing and taking care of lots and lots of plants - an interesting challenge if you live in a high rise apartment building.

Armed with The Nerves Project and available literature on growing algae to remove CO2 from air, this talk will summarize the process of building and testing a basic “breeder” bioreactor that uses algae to create more fresh oxygen in the home. The ultimate goal of this project is to build a reactor that can self-sustain an “optimzed” state of maximum CO2 removal for a given reactor vessel size, with the aid of artificial light, and electricity.

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/1bQlc-K6vN0" frameborder="0" allowfullscreen></iframe>
</div>

---

## Embedded Elixir with Nerves

Greg Mefford's presentation at Code BEAM STO 2018.

Nerves makes it very easy to leverage the BEAM in an embedded device using readily-available and low-cost hardware like the Raspberry Pi family of single-board computers. In this talk, we will cover the basics of what Nerves is and how to structure your application for easier testing without needing real hardware.

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/IVCQvcCEjkU" frameborder="0" allowfullscreen></iframe>
</div>

---

## Customize Your Car

Brien Wankel's presentation at Lonestar ElixirConf 2018.

Customize your car: An Adventure in Using Elixir and Nerves to Hack Your Vehicle's Electronics Network

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/ykVktdc7Ggc" frameborder="0" allowfullscreen></iframe>
</div>

---

## Building an Artificial Pancreas with Elixir and Nerves

Tim Mecklem's presentation at ElixirConf 2017.

People with Type 1 Diabetes have to constantly monitor & control their food, blood glucose, insulin, physical activity and other factors in order to manage this autoimmune disease effectively. Even with advancements like insulin pumps and continuous glucose monitoring, the process is still manual and error prone for many people. What would happen if someone with T1D could delegate the constant cycle of monitoring, predicting and controlling to a computer?

In this session, I'll get personal about my own journey in supporting my T1D wife using technology. You'll learn about an open source project called the Open Artificial Pancreas System, or OpenAPS, and how it closes the loop on a cycle that the rest of us take for granted. Then together we'll explore what happened when I took my knowledge of OpenAPS and Elixir and glued them together with the Nerves Project.

We'll touch briefly on the topics of hardware prototyping, reverse engineering and binary decoding and how it all came together in one project. Before the session is over, you'll see an embedded Elixir application talk to a commercial insulin pump through the power of the Nerves Project.

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/ARQD4BN_5ns" frameborder="0" allowfullscreen></iframe>
</div>

---

## Keep an Eye on the Sky with Nerves and Phoenix

Jeff Smith's presentation at ElixirConf 2017.

As part of the next generation air traffic control system, regulators in the United States and abroad will require most aircraft to be equipped with avionics by 2020 that automatically broadcast identity, position, and velocity data at regular intervals using a standard radio messaging protocol. This technology, known as Automatic Dependent Surveillance Broadcast (ADS-B), is already in use by the majority of aircraft today and can easily be received on the ground by anyone using cheap Software Defined Radio (SDR) hardware purchased online.

Because ADS-B messages can come from hundreds (if not thousands) of aircraft operating in the sky in parallel at any given time, Elixir is well suited to elegantly handle the problem of tracking them all concurrently in realtime. In this talk, we'll explore highly concurrent approaches to solving this problem using the tools and techniques offered by OTP and GenStage. We'll examine how SDR hardware support is provided using Nerves on an embedded Linux platform such as Raspberry Pi. Finally, we'll take a look at some ways we can visualize all of this flight activity on the web in realtime using Phoenix.

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/UoSQBOP_Siw" frameborder="0" allowfullscreen></iframe>
</div>

---

## Embedded Elixir for Monitoring the Built Environment

Christopher Coté's presentation at ElixirConf 2017.

At CRT Labs we are developing an open source building health monitoring system, Rosetta Home. The platform consists of several subsystems for gathering data from disparate data sources including hyper-local weather, whole-home energy usage, indoor environmental quality and HVAC utilization.

The platform is built on a Raspberry Pi 3 running Nerves, a system for building embedded Elixir systems, and several USB gateways for interacting with the different subsystem hardware. Through a combination of wireless protocols including WiFi, ZigBee and 915Mhz FSK we aggregate the disparate data sources for analysis within a cloud based GUI. The Raspberry Pi also hosts a local web server for configuration and review of real time sensor data using websockets and an Elm based frontend.

The cloud platform consists of a simple Elixir/Erlang middleware for client/server certificate verification, InfluxDB as the time-series data store and Grafana for data visualization.

The talk will go in depth into building a production Nerves system and include a full demo of the working system.

Christopher Coté is also a member of the Nerves core development team.

The platform itself is available here https://github.com/rosetta-home/rosetta_home . Along with open sourcing the core platform, we have also open sourced all of the libraries the platform is built upon.

* https://github.com/NationalAssociationOfRealtors/ssdp
* https://github.com/NationalAssociationOfRealtors/mdns
* https://github.com/NationalAssociationOfRealtors/raven
* https://github.com/NationalAssociationOfRealtors/meteo_stick
* https://github.com/NationalAssociationOfRealtors/chromecast
* https://github.com/NationalAssociationOfRealtors/ieq_gateway
* https://github.com/NationalAssociationOfRealtors/lifx
* https://github.com/NationalAssociationOfRealtors/radio_thermostat

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/_zQ_u7o1rNo" frameborder="0" allowfullscreen></iframe>
</div>

---

## Realtime Vehicle Tracking with Elixir and Phoenix.

James Smith's presentation at ElixirConf 2017.

Our client came to us with an idea. Help students catch their school buses on time. Doing this required adding realtime bus tracking to their mobile application. I knew Elixir would be well suited for this but, I underestimated just how much.

Elixir helped us quickly parse the binary protocols of GPS devices. Phoenix helped us to send realtime updates from devices to our mobile application. Ranch made it easy to deal with the thundering herd of GPS devices trying to connect to us all at once.

This is not to say that their weren't challenges along the way. We had to deal with hardware protocols that did not always line up with their spec sheets. Communication between us and the buses had to be safe and secure. The nature of communication over the cellular network meant messages could be received out of order. The logistics of school buses that can break down or get moved to different routes meant devices had to be dynamically supervised. Even through these challenges OTP, Elixir, and Phoenix continued to shine.

In this talk discuss these challenges and talk through the solutions we came up with. We will touch on parsing binary protocols, dealing with out of order messages and adding dynamic supervision in OTP.

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/aLnSO6FQpHs" frameborder="0" allowfullscreen></iframe>
</div>

---

## Nervous System - Nerves Clustering Using Your Own Distribution

Timmo Verlaan's presentation at ElixirConf.EU 2017.

Coming with Erlang R19 is the option to use your own distribution module. This creates the possibility for having auto-connecting Nerves devices without worrying about the local network or specifying node names upfront. In this talk I will explore the different solutions up until now. One of which was my first go at creating "distributed blinky" (having a led blink on 2+ devices taking turns). Then I will take a look at how we can create our own distribution module and see how we can leverage that so we don't need any upfront knowledge about node names and are independent of the local network. Our goal is to create an autonomously connecting Nerves cluster with zero effort! But, can it be done?

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/kMHXd_iMGRU" frameborder="0" allowfullscreen></iframe>
</div>

## Fly like an Eagle

Loic Vigneron's presentation at ElixirConf.EU 2017.

It is the story of the birth of a quadcopter built using a 3D printer, a Raspberry Pi 3 and some Elixir magic. I will begin from the genesis of the project up to a flying drone. Expect some code, some hardware and some 3D printing time-lapse.

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/TZnaqnxA4UY" frameborder="0" allowfullscreen></iframe>
</div>

## Prototype to Production: Creating Connected Hardware with Nerves

Justin Schneck's presentation at Erlang & Elixir Factory SF 2017

Nerves is a powerful platform for creating and distributing embedded linux systems in Elixir and Erlang. Using Nerves, you can quickly create robust devices from a wide selection of off the shelf hardware and accessories. Rapid prototyping is a crucial phase in the development of any product. Together, we will explore the new features of Nerves and demonstrate how to quickly create and iterate using devices like Raspberry Pi. Finally, we will describe the process of moving from prototype to production and how to create distributable devices.


<div class="video-container">
  <iframe src="https://www.youtube.com/embed/aIGVOFwYtHE" frameborder="0" allowfullscreen></iframe>
</div>

## Lonestar ElixirConf 2017 - Opening Keynote

Justin Schneck's Opening Keynote at Lonestar ElixirConf 2017.

Developing "hardware and hardware accessories" can be difficult and time consuming. Until now, you would have to constantly swap SD cards or create and push full firmware updates in order to iterate on your device. We want to make the development cycle as comfortable as possible by marrying the fundamentals of Erlang hot code reloading with connected Hardware in the Loop (HIL). Together, we will explore the Nerves development cycle through live demonstrations from mix nerves.new to mix firmware. Furthermore, we will push live code updates and even leverage the Phoenix Live Reloader on the Target. Finally, we will take a peek at executing ExUnit tests on connected hardware.

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/pVHhmqYozOM" frameborder="0" allowfullscreen></iframe>
</div>

## Creating a Nerves-based Status Monitor (or how to sneak Elixir into your company)

Andrew Selder's presentation at Lonestar ElixirConf 2017.

Like many of you, the organization I work for is deeply invested in an ecosystem other than Elixir, in our case Rails. However, we have lots of engineers interested in Elixir. The question: how do we get the rest of the developers interested and convince the bosses that Elixir is a worthwhile technology to invest in?

In deciding what to do, we had to consider the potential impact to our service (the Boss really frowns on taking down the site and annoying paying customers), the scope of the project (the Boss frowns on developers disappearing for a month to play with cool shiny things), intriguing the other engineers (engineers like cool shiny things). Balancing all these concerns was the key in getting buy-in from everyone.

We decided to build a status monitoring device using Nerves that shows the high level health of our app at a glance. We have LED strips showing recent apdex scores for our app (via NewRelic’s API), recent error rates (from Honeybadger), and the status of recent builds (from CircleCI), along with a big red flashing light for when Pingdom says our site is down.

For about $100 in parts, and a couple weekends of hacking, we built an appliance that was useful to the organization, showed off the power of Elixir/OTP, and was just darn cool!

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/vbPbulimWLk" frameborder="0" allowfullscreen></iframe>
</div>

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
