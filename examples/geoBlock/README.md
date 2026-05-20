[← Back to examples](../README.md)

# Geo Block

This application blocks incoming requests based on the client's country code.

## What it does

In `onRequestHeaders`, the app reads a `BLACKLIST` environment variable containing a comma-separated list of [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) country codes (e.g. `RU,CN,KP`). The request's country code is obtained from the `request.country` runtime property, which FastEdge populates from its Geo-IP data — no additional configuration is required to access it.

- If the country code appears in the blacklist, an INFO log is emitted and the request is rejected with a `403 Forbidden`.
- Allowed requests are also logged at INFO level, providing an audit trail for both blocked and permitted traffic.
- If the `BLACKLIST` env var is missing or the country cannot be determined, an appropriate error is returned.

> **Note on country code matching:** Comparison is exact-match and case-sensitive. FastEdge always provides uppercase ISO 3166-1 alpha-2 codes (e.g. `CN`, `RU`). Ensure your `BLACKLIST` values use uppercase accordingly.

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
