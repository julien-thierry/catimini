# Catimini

Catimini is a photo gallery app, based on Tauri, using Rust backend and TypeScript/React front-end.

## Building from source

### Setup

From a clean source tree, run:

```
    $ cd catimini-ui && npm install && cd -
```

### Building Rust components

To build only the Rust components run:

```
    $ cargo build
```

### Running

To start the application, run:

```
    $ npm --prefix catimini-ui run tauri dev
```