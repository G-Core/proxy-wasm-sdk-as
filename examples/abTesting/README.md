[← Back to examples](../README.md)

# A/B Testing

This application performs cookie-based A/B traffic splitting at the CDN layer, routing requests to different origin paths based on variant assignment.

## What it does

In `onRequestHeaders`, the app:

1. Checks for an existing experiment cookie (`fe_exp_<EXPERIMENT_NAME>`).
2. If no cookie is found, assigns the user to variant **A** or **B** (50/50 split).
3. Rewrites the request path by prepending the variant-specific path prefix (e.g. `/variant-a/original/path`).
4. Adds `X-Experiment` and `X-Variant` request headers for upstream visibility.

In `onResponseHeaders`, the app sets a `Set-Cookie` header to persist the variant assignment for subsequent requests (24-hour TTL).

> **Note on variant assignment entropy:** New-visitor assignment uses `getCurrentTime() % 2` as a simple 50/50 source. This is illustrative — it is not sticky across two requests that arrive in the same millisecond and is not reproducible in tests. Production A/B implementations typically hash a stable visitor identifier (e.g. client IP or session token) for deterministic, sticky pre-cookie assignment.

## Configuration

Set the following environment variables on your FastEdge application:

| Variable | Example | Description |
|----------|---------|-------------|
| `EXPERIMENT_NAME` | `homepage-redesign` | Name of the experiment (required) |
| `VARIANT_A_PATH` | `/variant-a` | Path prefix for variant A (required) |
| `VARIANT_B_PATH` | `/variant-b` | Path prefix for variant B (required) |

Your origin server should serve different content at each variant path prefix.

## Build

```sh
pnpm install
pnpm run asbuild
```

Build output:

| File | Description |
|------|-------------|
| `build/abTesting.wasm` | Optimised release binary — upload this to FastEdge |
| `build/abTesting-debug.wasm` | Debug binary with source maps |

## Deploy

Upload `build/abTesting.wasm` to the [FastEdge portal](https://portal.gcore.com) and attach it to your CDN application. Configure the experiment environment variables in the application settings.
