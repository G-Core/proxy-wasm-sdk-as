[← Back to examples](../README.md)

# HTTP Call

This application makes an asynchronous HTTP call to an external service using the proxy-wasm HTTP dispatch API.

## What it does

In `onRequestHeaders`, the app dispatches an outbound HTTP GET request to `httpbin.org/ip` and pauses the hook (`StopIteration`) until the response arrives. Dispatch is latched on an instance field so the second invocation of the hook (after the response is processed) returns `Continue` instead of dispatching again.

Inside the response callback passed to `httpCall`:

1. Checks whether the call succeeded (a `headers` value of `0` indicates failure — timeout, DNS error, etc.).
2. Reads and logs the `User-Agent` response header via `stream_context.headers.http_callback`.
3. Reads and logs the response body via `get_buffer_bytes(BufferTypeValues.HttpCallResponseBody, ...)`.

If the dispatch itself fails (e.g. invalid arguments), the app returns a `500` error to the client.

## Key concepts

- **`httpCall()`** on `RootContext` dispatches an async HTTP request. It accepts a cluster (host), headers, body, trailers, a timeout in milliseconds, the originating context, and a callback.
- **FastEdge resume model.** Returning `FilterHeadersStatusValues.StopIteration` pauses the hook. The runtime processes the HTTP response, invokes the callback, then **re-invokes `onRequestHeaders` on the same `Context` instance**. The `httpCallDispatched` latch gates re-dispatch so the hook returns `Continue` the second time. This differs from canonical proxy-wasm — calling `continueRequest()` is not required (and has no effect on FastEdge).
- **`stream_context.headers.http_callback`** provides access to the HTTP call response headers inside the callback. The SDK sets the effective context before the callback fires, so these lookups resolve against the originating request.
- **`get_buffer_bytes(BufferTypeValues.HttpCallResponseBody, ...)`** reads the response body inside the callback.

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
