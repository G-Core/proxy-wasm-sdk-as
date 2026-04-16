# Cache Control

This application sets `Cache-Control` response headers based on the content type and response status, giving you fine-grained control over CDN caching behaviour.

## What it does

In `onResponseHeaders`, the app inspects the `Content-Type` and `response.status` to apply an appropriate caching policy:

| Content Type | Cache Policy | Default Max-Age |
|---|---|---|
| Images, fonts, JS, CSS, WASM | `public, max-age=<STATIC_MAX_AGE>, immutable` | 1 year (31536000s) |
| `text/html` | `public, max-age=<HTML_MAX_AGE>, must-revalidate` | 1 hour (3600s) |
| `application/json`, `application/xml` | `private, max-age=<API_MAX_AGE>, must-revalidate` or `no-cache, no-store` | 0 (no cache) |
| Other | `public, max-age=600` | 10 minutes |
| Error responses (4xx/5xx) | `no-store` | — |

Also adds `Vary` headers where appropriate (`Accept-Encoding` for HTML, `Accept, Authorization` for API responses).

## Configuration

All environment variables are optional — sensible defaults are applied when unset.

| Variable | Default | Description |
|----------|---------|-------------|
| `STATIC_MAX_AGE` | `31536000` | Max-age for static assets (seconds) |
| `HTML_MAX_AGE` | `3600` | Max-age for HTML responses (seconds) |
| `API_MAX_AGE` | `0` | Max-age for API responses (0 = no-cache) |

## Build

```sh
pnpm install
pnpm run asbuild
```

Build output:

| File | Description |
|------|-------------|
| `build/cacheControl.wasm` | Optimised release binary — upload this to FastEdge |
| `build/cacheControl-debug.wasm` | Debug binary with source maps |

## Deploy

Upload `build/cacheControl.wasm` to the [FastEdge portal](https://portal.gcore.com) and attach it to your CDN application. Optionally configure the max-age environment variables.
