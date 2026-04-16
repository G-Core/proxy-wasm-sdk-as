# Large Dictionary

This application demonstrates how to read large environment variables (> 64 KB) using the proxy-wasm dictionary API.

## When to use `getDictionary` vs `getEnv`

| Function | Use when |
|----------|----------|
| `getEnv(name)` | Variable value is under 64 KB (most cases) |
| `getDictionary(name)` | Variable value may exceed the 64 KB WASI env var size limit |

The WASI environment variable interface has a **64 KB size limit** per variable. If your app needs to read larger values (e.g. large JSON configs, PEM certificates, policy documents), use `getDictionary` which calls `proxy_dictionary_get` and bypasses this limit.

For all other environment variable access, prefer `getEnv` as it uses the standard WASI environment interface.

## What it does

In `onRequestHeaders`, the app reads the `LARGE_CONFIG` environment variable using `getDictionary`, logs its size, and adds it as an `x-config-size` request header for the upstream to see.

## Configuration

Set the following on your FastEdge application:

| Name | Type | Description |
|------|------|-------------|
| `LARGE_CONFIG` | Environment variable | A large configuration payload (e.g. JSON, PEM certificate) |

## Build

```sh
pnpm install
pnpm run asbuild
```

Build output:

| File | Description |
|------|-------------|
| `build/largeDictionary.wasm` | Optimised release binary — upload this to FastEdge |
| `build/largeDictionary-debug.wasm` | Debug binary with source maps |

## Deploy

Upload `build/largeDictionary.wasm` to the [FastEdge portal](https://portal.gcore.com) and attach it to your CDN application. Configure the `LARGE_CONFIG` environment variable in the application settings.
