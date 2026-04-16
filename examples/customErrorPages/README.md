# Custom Error Pages

This application intercepts 4xx and 5xx error responses and replaces them with clean, branded HTML error pages.

## What it does

In `onResponseHeaders`, the app reads the `response.status` property. If it is in the 400-599 range, it sets the `Content-Type` to `text/html` and prepares for body replacement.

In `onResponseBody`, the app buffers the full response, then replaces the body with a styled HTML page containing:

- The numeric status code
- A human-readable error title (e.g. "Not Found", "Bad Gateway")
- A description explaining what went wrong
- An error category label ("Client Error" or "Server Error")

Covers all common HTTP error codes (400, 401, 403, 404, 405, 408, 429, 500, 502, 503, 504) with specific messages and falls back to generic messages for other codes.

## Build

```sh
pnpm install
pnpm run asbuild
```

Build output:

| File | Description |
|------|-------------|
| `build/customErrorPages.wasm` | Optimised release binary — upload this to FastEdge |
| `build/customErrorPages-debug.wasm` | Debug binary with source maps |

## Deploy

Upload `build/customErrorPages.wasm` to the [FastEdge portal](https://portal.gcore.com) and attach it to your CDN application. No environment variables or secrets are required.
