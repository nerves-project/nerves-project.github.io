# Nerves website

## Get started

Firstly, make sure that the [Hugo][Install Hugo] static site generator and
[Node.js] are available on your development machine.

[Install Hugo]: https://gohugo.io/getting-started/installing/
[Node.js]: https://nodejs.org/

Install dependencies.

```sh
asdf install
bin/setup
```

Run the development server.

```sh
bin/server
```

Visit http://localhost:1313


### Adding to the newsletter archive

* Get the newsletter HTML. Save in `layouts/partials/newsletter/nerves-newsletter-{ISSUE NUMBER}.html`
  * Steps to do this vary, so TBD
* Create `content/newsletter/YYYY-MM-DD-{title}.md` (Copy the previous one as starting point)
