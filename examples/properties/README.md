[← Back to examples](../README.md)

# Properties

This application reads and logs all known FastEdge runtime properties, exposing them as response headers.

> Note: This example does not cover all the available properties See the [CDN Properties](https://gcore.com/docs/fastedge/getting-started/cdn-properties) list.

## What it does

In `onRequestHeaders`, the app reads the following runtime properties using `get_property()` and adds each as a response header:

| Property            | Response header        |
| ------------------- | ---------------------- |
| `request.url`       | `request-uri`          |
| `request.host`      | *(validated only)*     |
| `request.path`      | `request-path`         |
| `request.scheme`    | `request-scheme`       |
| `request.extension` | `request-extension`    |
| `request.query`     | `request-query`        |
| `request.x_real_ip` | `request-x-real-ip`   |
| `request.country`   | `request-country`      |
| `request.city`      | `request-city`         |

`request.host` is validated for presence but not logged or exposed as a header — it must be non-empty for the upstream request to route correctly.

`request.extension` and `request.query` are optional: if absent, the property is logged with an empty value and processing continues without adding a response header.

If a required property is absent, the app returns a numeric HTTP status identifying the gap:

| Status | Property |
|--------|----------|
| 551 | `request.url` |
| 552 | `request.host` |
| 553 | `request.path` |
| 554 | `request.scheme` |
| 555 | `request.extension` *(optional — never triggered)* |
| 556 | `request.query` *(optional — never triggered)* |
| 557 | `request.x_real_ip` |
| 558 | `request.country` |
| 559 | `request.city` |

The app also supports overriding `request.url`, `request.host`, and `request.path` via query parameters (`url=`, `host=`, `path=`).

## Expected output

For a request to `/page.html?test=value` with geo properties populated, the app logs at INFO level:

```
onRequestHeaders >> uri: https://example.com/page.html?test=value
onRequestHeaders >> path: /page.html?test=value
onRequestHeaders >> scheme: https
onRequestHeaders >> extension: html
onRequestHeaders >> query: test=value
onRequestHeaders >> client_ip: 203.0.113.1
onRequestHeaders >> country: LU
onRequestHeaders >> city: Luxembourg
query=test=value
```

The corresponding `request-*` response headers are also set. Logs are visible in the FastEdge application logs.

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
