---
layout: learn
title: Nerves - Prepare your Tools
category: learn
---

# Prepare your Tools

Nerves development is possible on Mac, Linux, and Windows.
Currently, the Windows support isn't as good as we'd like it to be, but we're working on it.
Let us know in the Slack channel if you'd like to help improve the developer experience on Windows.

## On Mac OSX

Luckily, getting everything set up on Mac OSX is very simple if you're already using Homebrew.
If you're not, you'll want to first [install Homebrew](http://brew.sh/).

Once you have Homebrew installed, you can install the tools you'll need for developing with Elixir using Nerves:

    # Install Elixir and Erlang
    brew install elixir

    # Install Bakeware (which will also install fwup)
    ruby -e "$(curl -fsSL https://bakeware.herokuapp.com/bake/install)"

## On Linux

You should be able to successfully use Nerves on either CentOS or Ubuntu.
To get the required tools installed:

1. [Install Elixir and Erlang](http://elixir-lang.org/install.html)
2. [Install fwup](https://github.com/fhunleth/fwup/blob/master/README.md#installing)
3. [Install Ruby](https://www.ruby-lang.org/en/documentation/installation/)
4. [Install Bakeware](ruby -e "$(curl -fsSL https://bakeware.herokuapp.com/bake/install)")

## On Windows

Currently, the best way to go on Windows is to install a virtual machine running Ubuntu and connect to it using SSH.
We're excited to see that Microsoft has announced that they're working on integrated support for Linux-based tools in Windows 10.
We expect things to be much smoother when we can integrate with that platform.

In the mean time, you'll probably want to:

1. [Install VirtualBox](https://www.virtualbox.org/wiki/Downloads)
2. [Download Ubuntu Server 14.04](http://www.ubuntu.com/download/server)
3. [Install Ubuntu in a VirtualBox VM](http://askubuntu.com/questions/142549/how-to-install-ubuntu-on-virtualbox)
4. [Install WinSCP](https://winscp.net/eng/download.php), to move files between Windows and Linux
5. [Install PuTTY](http://www.chiark.greenend.org.uk/~sgtatham/putty/download.html) to connect to your Linux VM using SSH
6. [Install Win32 Disk Imager](https://sourceforge.net/projects/win32diskimager/), to burn images to an SD card
7. Connect to the Linux VM using SSH in PuTTY
8. In the Linux VM, follow the instructions in the **On Linux** section

