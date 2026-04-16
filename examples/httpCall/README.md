# HTTP Call

This application makes an asynchronous HTTP call to an external service using the proxy-wasm HTTP dispatch API.

## What it does

In `onRequestHeaders`, the app dispatches an outbound HTTP GET request to the incoming request's authority (host) at the `/ip` path. The request is paused (`StopIteration`) until the response arrives.

When the response callback fires in `onHttpCallResponse`:

1. Checks whether the call succeeded (a `headers` value of `0` indicates failure — timeout, DNS error, etc.).
2. Reads and logs the `User-Agent` response header via `stream_context.headers.http_callback`.
3. Reads and logs the response body via `get_buffer_bytes`.

If the dispatch itself fails (e.g. invalid arguments), the app returns a `500` error to the client.

## Key concepts

- **`httpCall()`** on `RootContext` dispatches an async HTTP request. It accepts a cluster (host), headers, body, trailers, a timeout in milliseconds, the originating context, and a callback.
- **`FilterHeadersStatusValues.StopIteration`** pauses the proxy pipeline until the callback completes.
- **`stream_context.headers.http_callback`** provides access to the HTTP call response headers inside the callback.
- **`get_buffer_bytes(BufferTypeValues.HttpCallResponseBody, ...)`** reads the response body.

## Build

```sh
pnpm install
pnpm run asbuild
```

Build output:

| File | Description |
|------|-------------|
| `build/httpCall.wasm` | Optimised release binary — upload this to FastEdge |
| `build/httpCall-debug.wasm` | Debug binary with source maps |

## Deploy

Upload `build/httpCall.wasm` to the [FastEdge portal](https://portal.gcore.com) and attach it to your CDN application. No environment variables or secrets are required.
