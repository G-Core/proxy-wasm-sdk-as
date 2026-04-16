# CORS

This application adds Cross-Origin Resource Sharing (CORS) headers to responses and handles preflight OPTIONS requests.

## What it does

In `onRequestHeaders`, the app checks the `Origin` request header against a configurable allow-list. If the request is an OPTIONS preflight, it responds immediately with CORS headers (204 No Content) and stops the pipeline.

In `onResponseHeaders`, for non-preflight requests from allowed origins, the app adds `Access-Control-Allow-Origin` and `Vary: Origin` response headers. Optionally exposes additional headers via `Access-Control-Expose-Headers`.

## Configuration

Set the following environment variables on your FastEdge application:

| Variable | Example | Description |
|----------|---------|-------------|
| `ALLOWED_ORIGINS` | `https://example.com,https://app.example.com` | Comma-separated allowed origins, or `*` for any (required) |
| `ALLOWED_METHODS` | `GET, POST, PUT, DELETE, OPTIONS` | Methods for preflight (optional, defaults shown) |
| `MAX_AGE` | `86400` | Preflight cache duration in seconds (optional, default `86400`) |
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
