# Log Time

This application logs UTC timestamps at the start of both the request and response phases.

## What it does

In `onRequestHeaders` and `onResponseHeaders`, the app calls `getCurrentTime()` (from the FastEdge SDK), converts the result to an ISO 8601 string, and logs it at `info` level.

`getCurrentTime()` internally uses the `get_current_time_nanoseconds` proxy-wasm ABI function and returns a value in milliseconds, suitable for use with `new Date(ms)`.

This is a minimal example useful as a starting point for timing and performance logging.

## Build

```sh
pnpm install
pnpm run asbuild
```

Build output:

| File                       | Description                                        |
| -------------------------- | -------------------------------------------------- |
| `build/logTime.wasm`       | Optimised release binary — upload this to FastEdge |
| `build/logTime-debug.wasm` | Debug binary with source maps                      |

## Deploy

Upload `build/logTime.wasm` to the [FastEdge portal](https://portal.gcore.com) and attach it to your CDN application. No environment variables are required. Logs are visible in the FastEdge application logs.
