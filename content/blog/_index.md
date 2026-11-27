---
title: Blog
eyebrow: Blog
# The H1. The word inside the span gets the highlighter swipe.
heading: Notes from the <span class="hl">workbench</span>
lede: >-
  The Nerves Newsletter lands here every couple of weeks: releases, hardware, talks and the
  occasional rabbit hole. In between, the Nerves team and guest writers dig into what they're
  building.
description: >-
  The Nerves blog: every issue of the Nerves Newsletter, plus posts from the Nerves team and
  guest writers.

# ---------------------------------------------------------------------------------------------
# How the blog works
#
# /blog/ lists two kinds of entries, newest first, grouped by year:
#   - Newsletter issues: the HTML files in content/newsletter/ (URLs stay /newsletter/…).
#   - Posts: Markdown files in this folder, content/blog/<yyyy-mm-dd-slug>.md (URL /blog/<file name>/).
# Both show up in the blog feed at /blog/index.xml.
#
# Writing a post: copy content/blog/2026-11-27-example-post.md (a draft that shows every part
# of the template) and fill in the front matter:
#
#   title:        The post title.
#   date:         2026-11-27. Sets the order and the year group on /blog/.
#   draft:        true while you work on it. Drafts never publish (`bin/server -D` shows them).
#   description:  One or two sentences. Used on the blog cards, in the RSS feed and as the
#                 page description for search engines and link previews.
#   author:       The byline, e.g. "Jane Doe" or "The Nerves team".
#   role:         Short line under the byline, e.g. "Nerves core team" or "Guest writer".
#   author_initials: Optional. The two letters in the avatar. Defaults to the initials of `author`.
#   author_image: Optional. Path to a square photo in static/, e.g. /img/blog/jane.jpg.
#                 Without it the avatar shows the initials.
#   author_bio:   Optional. One or two sentences for the "About the author" card at the end.
#                 Without it there is no author card.
#   author_links: Optional. Links in the author card, e.g.
#                   author_links:
#                     - name: GitHub
#                       url: https://github.com/janedoe
#                     - name: Website
#                       url: https://example.com
#
# Use ## headings for the sections: the "On this page" rail is built from them (it shows up
# once a post has two or more). Code fences can take a file name for the bar above the code:
#   ```elixir {filename="lib/my_app/application.ex"}
# ---------------------------------------------------------------------------------------------
---
