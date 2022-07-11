---
title: Increasing Warehouse Efficiency with Nerves at Le Tote
date: 2022-01-01
tags:
  - case
---

Learn how LeTote used Nerves to build a web-based kiosk system to drive
warehouse productivity

<!--more-->

## The Concept

Le Tote is a personalized clothing rental subscription service that needed a
better way to track inventory and keep the company’s warehouse operating smoothly.

Surprisingly, there are not a lot of off-the-shelf solutions for warehouse
management that accommodate for a rental model, where most of the items that
leave the warehouse return. Le Tote needed to account for each clothing item
that it rents out and monitor it throughout its lifecycle, which includes
activities like re-steaming, pressing, and finally repackaging the garments.

Le Tote previously kept track of each item through barcode scanners, but this
method wasn’t meeting Le Tote’s high standards for efficiency. Each garment has
many touchpoints in its warehouse lifecycle, and the barcodes on each item of
clothing were tiny, hidden on the back of the tag. Employees had to find and
scan each individual tag at each touchpoint, adding a lot of unnecessary time
to the production cycle.

![](/img/LeTote-case-1.jpg)
![](/img/LeTote-case-2.jpg)
![](/img/LeTote-case-3.jpg)

## How Nerves Helped

Le Tote hired Justin Schneck, co-author of the Nerves Project, as a Principal
Hardware Engineer to help them use Nerves to develop and implement an RFID
system to more efficiently track their product. And here’s where Nerves really
shines: in addition to building this custom RFID solution, Le Tote used Nerves
to build web-based kiosk systems to guide employees with all kinds of tasks all
across the warehouse.

Nerves made developing the kiosk system incredibly easy because it helps apply
the agile principles of web development to hardware. Justin and his team were
able to use their web developers as embedded engineers by having them create web
apps which would then be run on top of a Chromeless Chrome window that's
rendered on a device’s display. This helped them to make the most of their
existing people and resources, rather than hunting for rare C++ developers to
complete the embedded work they needed done.

This approach also allowed Le Tote to then create rapid prototyping mechanisms.
They were able to replace a third-party vendor for pack stations and receiving
workstations within months by being able to rapidly develop and iterate on their
own software and deploy it so quickly and easily.

## The Results

With Nerves, Justin and the Le Tote team were able to build systems and
processes that made the warehouse function more efficiently. Clothing items can
now be tracked more quickly and reliably throughout their lifecycles, and
employees are able to move throughout the warehouse to complete tasks in a more
streamlined manner.

Finally, the system reliability and uptime of the warehouse was dramatically
increased by switching from Windows to Nerves alone.
