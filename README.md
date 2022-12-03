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

Visit [localhost:1313](http://localhost:1313).

## Adding to the newsletter archive

Once the Nerves newsletter has been delivered, get the URL to the HTML source
(usually found at the top where it says `No images? Click here`) then run the
script:

```sh
./bin/add_newsletter URL
```

See `./bin/add_newsletter --help` for customization and more info.
