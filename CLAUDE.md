# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the **proxy-wasm AssemblyScript SDK** (`@gcoredev/proxy-wasm-sdk-as`) — a G-Core fork of the Kong proxy-wasm AssemblyScript SDK that adds FastEdge-specific host APIs. It compiles to WebAssembly and runs as a proxy filter in the FastEdge CDN platform.

## Commands

```sh
# Install dependencies
pnpm install

# Build both debug and release wasm
pnpm run asbuild

# Build only debug
pnpm run asbuild:debug

# Build only release
pnpm run asbuild:release

# Build an example (e.g., geoBlock)
cd examples/geoBlock && pnpm install && pnpm run asbuild

# Generate docs
pnpm run docs
```

SDK build output goes to `build/` (`debug.wasm`, `debug.wat`, `release.wasm`, `release.wat`).

Example build output uses named files: `build/<name>.wasm` (release) and `build/<name>-debug.wasm` (debug).

## Architecture

The SDK has two layers:

### Core proxy-wasm layer (`assembly/`)

- **`imports.ts`** — raw host function declarations (`@external("env", ...)`) for the proxy-wasm ABI and FastEdge-specific APIs (dictionary, secrets, kv-store)
- **`runtime.ts`** — high-level TypeScript-style wrappers: `RootContext`, `Context`, `BaseContext` classes, enums (`WasmResultValues`, `FilterHeadersStatusValues`, etc.), `Headers`/`HeaderPair` types, and helper functions (`log`, `send_local_response`, etc.)
- **`exports.ts`** — exported wasm entry points (`proxy_on_*` functions) that the host runtime calls into; they dispatch to the user's `RootContext`/`Context` subclasses
- **`proxy.ts`** — re-exports `malloc` and all `exports.ts` symbols; consumer plugins do `export * from "@gcoredev/proxy-wasm-sdk-as/assembly/proxy"`
- **`index.ts`** — re-exports all public SDK symbols from `runtime.ts`
- **`malloc.ts`** — custom malloc used by the host to allocate buffers that the wasm returns

### FastEdge-specific layer (`assembly/fastedge/`)

- **`dictionary.ts`** — `getEnv(name)`: reads environment variables via `proxy_dictionary_get`
- **`env.ts`** — `getEnvVar(name)`: deprecated wrapper around `process.env` (use `getEnv` instead)
- **`secrets.ts`** — `getSecret(name)`, `getSecretEffectiveAt(name, slot)`: reads secrets via `proxy_get_secret` / `proxy_get_effective_at_secret`. Also exports `getSecretVar(name)` and `getSecretVarEffectiveAt(name, slot)` as deprecated aliases.
- **`kvStore.ts`** — `KvStore` class: `open(storeName)`, `get(key)`, `scan(pattern)`, `zrangeByScore(key, min, max)`, `zscan(key, pattern)`, `bfExists(key, item)`. Also exports `ValueScoreTuple` type used by zrange/zscan results.
- **`utils/runtime.ts`** — `getCurrentTime()`: returns current time in milliseconds (wraps `get_current_time_nanoseconds`). `setLogLevel(level)`: sets minimum log level (defaults to `LogLevelValues.info`). Re-exports `log` and `LogLevelValues` from core.
- **`utils/listParser.ts`** — generic binary list deserializer used by KvStore for multi-value responses (wire format: `[u32 count][u32[] sizes][data...]`)

### How users write plugins

Users extend `RootContext` and `Context`, then call `registerRootContext`. Their `assembly/index.ts` must do `export * from "@gcoredev/proxy-wasm-sdk-as/assembly/proxy"` to expose wasm entry points. The `asconfig.json` must include `"use": "abort=abort_proc_exit"`.

The `stream_context` global in `runtime.ts` provides access to `stream_context.headers.request` and `stream_context.headers.response` for reading/writing HTTP headers.

### Memory management

Host-allocated buffers are managed through `ArrayBufferReference` in `runtime.ts`. `toArrayBuffer()` must be called exactly once after a host call — it transfers ownership and calls `free()` on the raw pointer. The global `globalArrayBufferReference` is reused across calls (not thread-safe, but wasm is single-threaded).

## Examples

The `examples/` directory contains 8 standalone examples. Each is an independent package with its own `package.json`, `asconfig.json`, and `node_modules`. They reference the SDK via `"file:../.."` (local), not the published npm version.

| Example       | Description                                                                 |
| ------------- | --------------------------------------------------------------------------- |
| `body`        | Request/response body read and manipulation                                 |
| `geoBlock`    | Block requests by country using a `BLACKLIST` env var                       |
| `geoRedirect` | Route requests to different origins by country code                         |
| `headers`     | Add, remove, and replace HTTP headers with validation                       |
| `jwt`         | Validate JWT Bearer tokens (requires `@gcoredev/as-jwt` dep)                |
| `kvStore`     | Query a KV Store — get/scan/zrange/zscan/bfExists (has `assembly/utils.ts`) |
| `logTime`     | Log UTC timestamps at request and response phases                           |
| `properties`  | Read and expose FastEdge runtime properties                                 |

Build output per example: `build/<name>.wasm` (release), `build/<name>-debug.wasm` (debug). The `build/` and `node_modules/` directories are gitignored per example.

When adding a new example, follow the same structure: standalone `package.json` with `file:../..` SDK dep, `asconfig.json` with named outputs, and a `README.md` explaining what it does and any required env/secret variables.

### Key constraint

AssemblyScript (not TypeScript) — many TS features are unavailable. No closures over mutable state, no `try/catch` in most contexts, explicit numeric types (`u32`, `i32`, `f64`), and `changetype<usize>()` for pointer casting.
