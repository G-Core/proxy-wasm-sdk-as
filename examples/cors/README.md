[← Back to examples](../README.md)

# CORS

This application adds Cross-Origin Resource Sharing (CORS) headers to responses from allowed origins.

## What it does

In `onResponseHeaders`, for requests from allowed origins, the app adds `Access-Control-Allow-Origin` and `Vary: Origin` response headers. Optionally exposes additional headers via `Access-Control-Expose-Headers`. Requests from disallowed origins pass through unchanged (no CORS headers added).

> **Note on OPTIONS preflights:** FastEdge's edge layer answers OPTIONS preflight requests directly — proxy-wasm hooks do not fire for OPTIONS. Configure preflight behaviour (allowed methods, max-age, etc.) in your CDN application settings, not in WASM code.

## Configuration

Set the following environment variables on your FastEdge application:

| Variable | Example | Description |
|----------|---------|-------------|
| `ALLOWED_ORIGINS` | `https://example.com,https://app.example.com` | Comma-separated allowed origins, or `*` for any (required) |
| `EXPOSE_HEADERS` | `X-Request-Id, X-Trace-Id` | Response headers to expose to the browser (optional) |

## Build

```sh
pnpm install
pnpm run asbuild
```

Build output:

| File | Description |
|------|-------------|
| `build/cors.wasm` | Optimised release binary — upload this to FastEdge |
| `build/cors-debug.wasm` | Debug binary with source maps |

## Deploy

Upload `build/cors.wasm` to the [FastEdge portal](https://portal.gcore.com) and attach it to your CDN application. Configure the `ALLOWED_ORIGINS` environment variable in the application settings.
