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

Upload `build/kvStore.wasm` to the [FastEdge portal](https://portal.gcore.com) and attach it to your CDN application. Ensure the KV Store you want to query is configured and linked to the application.
