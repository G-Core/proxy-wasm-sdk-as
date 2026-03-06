# Body

This application modifies the request and response body using the `onRequestBody` and `onResponseBody` lifecycle hooks.

## What it does

1. **`onRequestHeaders`** — removes the `content-length` header, required because the body content will be altered.

2. **`onRequestBody`** — buffers the full request body then checks whether it contains the word `Client`. If found, the body is replaced with a redaction notice.

3. **`onResponseHeaders`** — removes `content-length`, sets `transfer-encoding: Chunked`, and captures the `content-type` into a runtime property.

4. **`onResponseBody`** — logs the request URL, content type, and full response body once the stream is complete.

This demonstrates the basic flow for body manipulation across all lifecycle hooks. Key points:

- Headers must be adjusted _before_ modifying the body (`content-length`, `transfer-encoding`).
- The `end_of_stream` flag is checked before processing, allowing the body to be buffered across multiple invocations before acting on it.

## Build

```sh
pnpm install
pnpm run asbuild
```

Build output:

| File                    | Description                                        |
| ----------------------- | -------------------------------------------------- |
| `build/body.wasm`       | Optimised release binary — upload this to FastEdge |
| `build/body-debug.wasm` | Debug binary with source maps                      |

## Deploy

Upload `build/body.wasm` to the [FastEdge portal](https://portal.gcore.com) and attach it to your CDN application.
