# Geo Redirect

This application redirects requests to different origin URLs based on the client's country code.

## What it does

In `onRequestHeaders`, the app reads the client's country code from the `request.country` runtime property (Geo-IP data) and looks up a matching environment variable by that country code. The `request.url` runtime property is then set to route the request to the corresponding origin.

- If a country-specific origin is configured (e.g. env var `DE=https://de.example.com`), the request is routed there.
- Otherwise it falls back to the `DEFAULT` origin.
- Uses [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) country codes.

## Configuration

Set the following environment variables on your FastEdge application:

| Variable | Example | Description |
|----------|---------|-------------|
| `DEFAULT` | `https://origin.example.com` | Fallback origin URL (required) |
| `<COUNTRY_CODE>` | `DE=https://de.example.com` | Per-country origin URL (optional, one per country) |

## Build

```sh
pnpm install
pnpm run asbuild
```

Build output:

| File | Description |
|------|-------------|
| `build/geoRedirect.wasm` | Optimised release binary — upload this to FastEdge |
| `build/geoRedirect-debug.wasm` | Debug binary with source maps |

## Deploy

Upload `build/geoRedirect.wasm` to the [FastEdge portal](https://portal.gcore.com) and attach it to your CDN application. Configure the `DEFAULT` environment variable and any per-country overrides in the application settings.
