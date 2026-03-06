# Properties

This application reads and logs all known FastEdge runtime properties, exposing them as response headers.

> Note: This example does not cover all the available properties See the [CDN Properties](https://gcore.com/docs/fastedge/getting-started/cdn-properties) list.

## What it does

In `onRequestHeaders`, the app reads the following runtime properties using `get_property()` and adds each as a response header:

| Property            | Response header     |
| ------------------- | ------------------- |
| `request.url`       | `request-uri`       |
| `request.path`      | `request-path`      |
| `request.scheme`    | `request-scheme`    |
| `request.extension` | `request-extension` |
| `request.query`     | `request-query`     |
| `request.x_real_ip` | `request-x-real-ip` |
| `request.country`   | `request-country`   |
| `request.city`      | `request-city`      |

If any property is missing, a numeric error code is returned to help identify which property was absent. The app also supports overriding `request.url`, `request.host`, and `request.path` via query parameters (`url=`, `host=`, `path=`).

## Build

```sh
pnpm install
pnpm run asbuild
```

Build output:

| File                          | Description                                        |
| ----------------------------- | -------------------------------------------------- |
| `build/properties.wasm`       | Optimised release binary — upload this to FastEdge |
| `build/properties-debug.wasm` | Debug binary with source maps                      |

## Deploy

Upload `build/properties.wasm` to the [FastEdge portal](https://portal.gcore.com) and attach it to your CDN application. No environment variables are required.
