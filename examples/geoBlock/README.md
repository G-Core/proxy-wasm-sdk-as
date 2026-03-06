# Geo Block

This application blocks incoming requests based on the client's country code.

## What it does

In `onRequestHeaders`, the app reads a `BLACKLIST` environment variable containing a comma-separated list of [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) country codes (e.g. `RU,CN,KP`). The request's country code is obtained from the `request.country` runtime property (populated by FastEdge's Geo-IP data).

- If the country code appears in the blacklist, the request is rejected with a `403 Forbidden`.
- If the `BLACKLIST` env var is missing or the country cannot be determined, an appropriate error is returned.

## Configuration

Set the following environment variable on your FastEdge application:

| Variable    | Example    | Description                                   |
| ----------- | ---------- | --------------------------------------------- |
| `BLACKLIST` | `RU,CN,KP` | Comma-separated list of blocked country codes |

## Build

```sh
pnpm install
pnpm run asbuild
```

Build output:

| File                        | Description                                        |
| --------------------------- | -------------------------------------------------- |
| `build/geoBlock.wasm`       | Optimised release binary — upload this to FastEdge |
| `build/geoBlock-debug.wasm` | Debug binary with source maps                      |

## Deploy

Upload `build/geoBlock.wasm` to the [FastEdge portal](https://portal.gcore.com) and attach it to your CDN application. Configure the `BLACKLIST` environment variable in the application settings.
