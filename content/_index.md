---
# The content of the Homepage.
tagline: |
  Elixir ❤️ Embedded
aboutNerves: |
  **Nerves** is an open-source platform that combines the rock-solid BEAM virtual machine
  and Elixir ecosystem to easily build and deploy production embedded systems.
getStartedURL: './getting_started'
introduction: |
  Hardware doesn't have to be hard. Nerves makes edge computing easier by solving
  the most complex infrastructure problems. Let Nerves take care of the network,
  discovery, I/O, firmware updates, and more. Focus your team on what matters —
  writing robust and maintainable software.
features:
  - name: Portable
    image: img/portable.svg
    description: |
      Nerves runs out-of-the-box on commonly available hardware. Nerves
      leverages Linux and Buildroot to minimize the effort to port to other
      devices.
  - name: Lean
    image: img/scalable.svg
    description: |
      Nerves uses Elixir Mix releases to include only the code you need. Most
      Nerves ports provide a Linux kernel and runtime with the basics so that
      you build up rather than trim down. Firmware sizes start in the 20-30 MB
      range.
  - name: Reliable
    image: 'img/high-reliability.svg'
    description: |
      Nerves uses the
      [Erlang runtime system](https://en.wikipedia.org/wiki/Erlang_(programming_language)),
      known for being distributed, fault-tolerant, soft real-time, and highly
      available. Nerves firmware is immutable so you know exactly what software
      is running.
  - name: Secure
    image: 'img/secure.svg'
    description: |
      Avoid hidden bugs and vulnerabilities with Nerves' secure opt-in approach
      to building. Nerves starts minimal and provides regular security updates
      to Erlang and Linux components. SBOM information is available via the
      Buildroot integration.
  - name: Efficient
    image: img/agile.svg
    description: |
      Take advantage of Erlang and Elixir's I/O optimizations such as IOData
      that minimize data copies over the entire stack. Thanks to common
      abstractions, much of the ecosystem uses these features already.
  - name: Extensible
    image: 'img/extensible.svg'
    description: |
      Nerves is just one part of the vibrant Elixir ecosystem. Take advantage of
      other Elixir projects like Phoenix, Nx, Livebook and more in embedded
      projects.
  - name: Agile
    image: 'img/agile.svg'
    description: |
      Nerves helps you bring the principles of agile development to your IoT
      development cycle. Because Nerves runtime is immutable, Nerves also
      brings agility to long-term maintenance.
  - name: Polyglot
    image: 'img/polyglot.svg'
    description: |
      Nerves is written in [Elixir](https://elixir-lang.org), but
      you don't have to rewrite everything in Elixir to get the advantages of
      Nerves — bring your own code (like C, C++, Zig, Rust, and more)
      and ship faster.
technologies:
  - name: 'Erlang'
    image: 'img/erlang.svg'
    URL: https://en.wikipedia.org/wiki/Erlang_(programming_language)
    description: |
      - Simple strategy for building reliable programs
      that's consistent through the whole language and ecosystem
        - There's really only one way to build things and it involves message
        passing to fine-grained lightweight processes that are monitored and
        recovered via supervision trees
        - No other language or ecosystem has such
      consistency here and it gives confidence that the blast radius from
      failures is contained
      - Virtual machine with fine-grained Garbage collection (GC)
        - You get the benefits of a higher level language without the GC cost
  - name: 'Elixir'
    image: 'img/elixir.svg'
    URL: https://en.wikipedia.org/wiki/Elixir_(programming_language)
    description: |
      - Built on top of the Erlang virtual machine (BEAM)
      - Fun language - the second most loved programming language in
      [Stack Overflow Developer Survey 2022](https://survey.stackoverflow.co/2022/#section-most-loved-dreaded-and-wanted-programming-scripting-and-markup-languages)
      - Vibrant and friendly community
  - name: 'Linux'
    image: 'img/linux.svg'
    URL: https://en.wikipedia.org/wiki/Linux
    description: |
      - Allows Nerves to run on lots of hardware
      - Enables use of code that's not yet available for the
      [Erlang virtual machine](https://en.wikipedia.org/wiki/BEAM_(Erlang_virtual_machine))
newsletter:
  description: |
    The Nerves newsletter is managed with ❤️ by
    <span class="icon-text">
      <span><a href="https://underjord.io">Underjord.io</a></span>
      <span class="icon">
        <img src="https://underjord.io/img/logo2.svg"></img>
      </span>
    </span>

    Some topics in each issue include:

    - Project news and releases
    - Featured projects
    - Featured talks
    - Technical notes explaining parts of Nerves, straight from the core team
    - Community contribution opportunities
    - Possibly sponsors if there is interest
  subscriptionURL: 'https://underjord.io/nerves-newsletter.html'
  archiveURL: 'https://embedded-elixir.com/page/newsletter'
  feedURL: 'https://underjord.io/feed.xml'
featuredCases:
  - name: 'Farmbot'
    image: 'img/Farmbot-case-cover.jpg'
    URL: cases/farmbot
    description: |
      Managing Fleets of Smart Farming Devices with Nerves
  - name: 'Hop'
    image: 'img/Hop-case-cover.jpg'
    URL: cases/hop
    description: |
      Using Nerves to Build a Facial Recognition-Powered Beer Kiosk System
  - name: 'Le Tote'
    image: 'img/LeTote-case-cover.jpg'
    URL: cases/letote
    description: |
      Increasing Warehouse Efficiency with Nerves
getting_started:
  - name: 'Try it out'
    image: 'img/nerves_livebook.png'
    link: https://github.com/livebook-dev/nerves_livebook/blob/main/README.md
    link_text: Nerves Livebook
    description: |
      Use a prebuilt firmware image loaded with Livebook so you can start playing
      on real hardware immediately. No build required. You'll be able to run through
      guided Nerves tutorials from the comfort of your browser.
  - name: 'Build an example'
    image: 'img/compile.svg'
    link: https://hexdocs.pm/nerves/getting-started.html#nerves-examples
    link_text: See all examples
    description: |
      Nerves maintains serveral common application examples. Setup your development
      environment and use one of these as a starting point for your specific situation.
    examples:
      - link: https://github.com/nerves-project/nerves_examples/tree/main/hello_wifi
        image: img/wifi.svg
      - link: https://github.com/nerves-project/nerves_examples/tree/main/hello_phoenix
        image: img/phoenix.svg
      - link: https://github.com/nerves-project/nerves_examples/tree/main/blinky
        image: img/led.svg
      - link: https://github.com/nerves-project/nerves_examples/
        image: img/nerves_motd.png
  - name: 'Full DIY'
    image: 'img/nerves_new.png'
    link: https://hexdocs.pm/nerves/getting-started.html#creating-a-new-nerves-app
    link_text: Create a new Nerves app
    description: |
      Installation instructions to setup your development environment and make your
      own firmware from scratch.
---
