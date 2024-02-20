# Nerves website

## Get started

The website uses Hugo and Node.js. We're using `asdf` to manage versions, so
first install the `hugo` and `nodejs` plugins if you haven't already. The
default `hugo` plugin in `asdf` doesn't support extended Hugo versions so if you
get an error, that might be the issue.

```sh
asdf plugin add hugo
asdf plugin add nodejs
```

Then install dependencies:

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
