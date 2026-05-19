[← Back to examples](../README.md)

# KV Store

This application demonstrates reading from a FastEdge KV Store via query parameters, supporting multiple access patterns: `get`, `scan`, `zrange`, `zscan`, and `bfExists`.

## What it does

In `onResponseBody`, the app reads query parameters from the incoming request to determine which KV Store to open and what operation to perform. The result is returned as a JSON body in the response.

Supported actions:

| Action     | Parameters                   | Description                          |
| ---------- | ---------------------------- | ------------------------------------ |
| `get`      | `store`, `key`               | Fetch a single value by key          |
| `scan`     | `store`, `match`             | Scan keys matching a pattern         |
| `zrange`   | `store`, `key`, `min`, `max` | Range query on a sorted set by score |
| `zscan`    | `store`, `key`, `match`      | Pattern scan on a sorted set         |
| `bfExists` | `store`, `key`, `item`       | Check existence in a Bloom filter    |

Example request:

```
GET /?store=my-store&action=get&key=some-key
```

### Query Parameters

`store` - the name of the store you wish to open. This is the name given to a store on the application.

`action` - What you wish to perform. Options are "get", "scan", "zscan", "zrange", "bfExists". ( If no action is provided it will default to "get" )

`key` - The key you wish to access in the KV Store.

`match` - A prefix match pattern, used by "scan" and "zscan". Must include a wildcard. e.g. `foo*`

`min` / `max` - Used by zrange for defining the range of scores you wish to receive results for.

`item` - Used by Bloom Filter exists function.

> **Note — error responses:** When query parameters are missing or invalid, or when the store cannot be opened, the app sets `response.status` to `545` via `set_property` and writes a JSON error body. Because this hook runs in `onResponseBody` (after response headers have already been transmitted), the status property is advisory to the CDN runtime and the origin HTTP status passes through to the client. The JSON error body is the authoritative signal.

## KV Store setup

Before the happy-path actions (`get`, `scan`, etc.) can be exercised, a KV Store must be created and linked to the application:

1. **Create a KV Store** in the [FastEdge portal](https://portal.gcore.com) under the Key-Value storage section.
2. **Populate it** with the keys and values you want to query.
3. **Link the store to the app** — when configuring the FastEdge application, add the store under the app's KV store bindings. The name you give the binding is what the `store` query parameter must match at runtime.

The `store` parameter in the request (e.g. `?store=my-store`) must exactly match the binding name configured on the application.

## Build

```sh
pnpm install
pnpm run asbuild
```

Build output:

| File                       | Description                                        |
| -------------------------- | -------------------------------------------------- |
| `build/kvStore.wasm`       | Optimised release binary — upload this to FastEdge |
| `build/kvStore-debug.wasm` | Debug binary with source maps                      |

## Deploy

Upload `build/kvStore.wasm` to the [FastEdge portal](https://portal.gcore.com) and attach it to your CDN application. Ensure the KV Store you want to query is created, populated, and linked to the application (see [KV Store setup](#kv-store-setup) above).
