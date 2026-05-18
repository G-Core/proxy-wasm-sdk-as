[← Back to examples](../README.md)

# Hello World — Minimal CDN App

The simplest possible FastEdge CDN application using the AssemblyScript proxy-wasm SDK. All four lifecycle hooks are present with pass-through implementations.

This example serves as the base skeleton for scaffolding new CDN applications.

## What it does

Implements all four proxy-wasm lifecycle hooks — `onRequestHeaders`, `onRequestBody`, `onResponseHeaders`, and `onResponseBody` — each logging a `"Hello World!"` message and returning `Continue` to pass the request and response through unchanged.

This teaches the minimal structure every CDN app needs: a `RootContext`, a `Context`, and a `registerRootContext` call. No modification of traffic happens here — the hooks just fire and pass through.

Expected logs per request:

```
onRequestHeaders >> Hello World!
onResponseHeaders >> Hello World!
```

`onRequestBody` and `onResponseBody` also fire if the request or response has a body, but CDN traffic often has neither.

## Build

```bash
pnpm install
pnpm run asbuild
```

Build output:

| File | Description |
|------|-------------|
| `build/helloWorld.wasm` | Optimised release binary — upload this to FastEdge |
| `build/helloWorld-debug.wasm` | Debug binary with source maps |

## Deploy

Upload `build/helloWorld.wasm` to the [FastEdge portal](https://portal.gcore.com) and attach it to your CDN application. No environment variables are required.
