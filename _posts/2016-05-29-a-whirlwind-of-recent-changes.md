---
layout: post
title: A Whirlwind of Recent Changes
author: Greg Mefford
category: news

---

If you've been following along in the #nerves channel on the elixir-lang Slack, you'll know that there have been a lot of changes lately.
In this post, I'd like to highlight a few: new home for Nerves documentation on HexDocs, native mix integration, local caching for Nerves Systems, and a status update on WiFi support.

## Nerves Documentation on HexDocs

We are in the process of migrating the bulk of the Nerves documentation from [nerves-project.org](http://www.nerves-project.org) to [HexDocs](https://hexdocs.pm/nerves/).
We think you'll enjoy the consistent look-and-feel that you're used to seeing from other Elixir-based projects.
It also helps us more-easily keep the documentation in-sync with the codebase.

This site will focus more on news and communication about the project, more-detailed tutorials, and links to examples of how people are using Nerves in their projects.

## Mix Integration

As Justin announced in his [Enhanced Embedded Systems with Nerves](https://youtu.be/118-g0ODfgg) presentation at ElixirConf EU, we have completed the work to get Nerves working natively in Elixir's `mix` tool.
That means you can much more easily compile firmware for your target hardware without having to get Bakeware and its dependencies installed and properly configured.
The Bakeware tools really helped to bridge the gap and get people started, but we think you'll have an even easier time diving in with native `mix` integration!

Now firmware development with Nerves looks just like the Elixir workflow you're used to:

{% highlight bash %}
# Install Nerves
$ mix archive.install https://github.com/nerves-project/archives/raw/master/nerves_bootstrap.ez

# Generate and compile just like any Elixir project
$ mix nerves.new hello_nerves --target rpi3
$ cd hello_nerves
$ mix deps.get
$ mix compile

# Build your firmware and burn it to an SD card
$ mix firmware
$ mix firmware.burn
{% endhighlight %}

## Local Caching for Nerves Systems

On initial release, the `mix` integration didn't support a local cache for Nerves Systems.
This meant that, when downloading a pre-compiled System or compiling your own custom System, it was stored separately as a dependency of each project.
Starting today with `nerves_system` version `0.1.3`, the Nerves System Cache can be configured to look for a local cache of the System your project is requesting to use, so it doesn't need to be downloaded and can be easily shared by multiple projects.
All you have to do is set the environment variable `NERVES_SYSTEM_CACHE=local`.
You can read more details about how this works in [the documentation](https://hexdocs.pm/nerves/systems.html#building-nerves-systems).

## WiFi Support Update

Probably the most-anticipated feature of Nerves is support for WiFi connectivity.
It's going to open the doors to all kinds of great applications and functionality, especially in the Internet of Things space.
We're not quite ready yet to release official support for Wifi, but we're happy to say that we do have it working well enough to release interim support to start getting feedback.
If you'd like to give it a try, you can add `nerves_interim_wifi` to your project and leave feedback about any issues on [the GitHub page](https://github.com/nerves-project/nerves_interim_wifi) or in the #nerves channel on the Elixir-Lang Slack.

