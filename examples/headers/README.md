# Headers

This application demonstrates adding, removing, and modifying HTTP headers in both the `onRequestHeaders` and `onResponseHeaders` lifecycle hooks, then validates that the mutations took effect.

## What it does

In `onRequestHeaders` and `onResponseHeaders` the app:

1. Adds `new-header-01`, `new-header-02`, and `new-header-03`.
2. Removes `new-header-01` (see known issue below).
3. Replaces the value of `new-header-02` with `new-value-02`.
4. Adds a second value for `new-header-03`.
5. Validates that only the expected headers are present and returns an error response if any unexpected ones are found.

This is useful as a reference for understanding the add/remove/replace header API and the validation pattern.

### Known Issues

Nginx does not allow deleting headers — calling `remove()` will set the header value to an empty string rather than removing it entirely.

## Build

```sh
pnpm install
pnpm run asbuild
```

Build output:

| File                       | Description                                        |
| -------------------------- | -------------------------------------------------- |
| `build/headers.wasm`       | Optimised release binary — upload this to FastEdge |
| `build/headers-debug.wasm` | Debug binary with source maps                      |

## Deploy

Upload `build/headers.wasm` to the [FastEdge portal](https://portal.gcore.com) and attach it to your CDN application. No environment variables are required.
