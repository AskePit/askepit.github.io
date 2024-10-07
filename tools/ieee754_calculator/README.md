# ieee754-web
Online IEEE-754 converter

## WASM build

If you want to rebuild Rust part of an application you'll need to rebuild it targeted to WASM

### WASM installation

- Go to `backend/` directory
- Install [wasm-pack](https://rustwasm.github.io/wasm-pack/)
- Execute following:

```bash
rustup update
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli
```

### Build

```bash
wasm-pack build --target web
cp pkg/ieee754_web.js ../
cp pkg/ieee754_web_bg.wasm ../
```