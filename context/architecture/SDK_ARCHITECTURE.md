# SDK Architecture

## Two-Layer Design

The SDK is split into two layers:

1. **Core proxy-wasm layer** (`assembly/`) — implements the proxy-wasm ABI v0.2.1 with context classes, lifecycle dispatch, header manipulation, and memory management
2. **FastEdge-specific layer** (`assembly/fastedge/`) — extends the core with Gcore host APIs for environment variables, secrets, KV store, and dictionary access

Users interact with both layers: they extend core context classes and call FastEdge APIs from within lifecycle hooks.

---

## Core Layer (`assembly/`)

### File Roles

| File | Role |
|------|------|
| `imports.ts` | Raw `@external("env", ...)` host function declarations — the ABI boundary |
| `runtime.ts` | High-level wrappers: context classes, enums, helper functions, stream context |
| `exports.ts` | Wasm entry points (`proxy_on_*`) that the host calls; dispatches to user contexts |
| `proxy.ts` | Re-exports `malloc` + `exports.ts` — consumer plugins do `export * from ".../proxy"` |
| `index.ts` | Re-exports public API from `runtime.ts` — consumer plugins import from here |
| `malloc.ts` | Custom `malloc`/`free` using AssemblyScript's ITCMS GC (`__pin`/`__unpin`) |

### Context Class Hierarchy

```
BaseContext (abstract)
├── RootContext          ← Shared instance, one per VM
│   ├── onConfigure()   ← Config load
│   ├── onStart()       ← VM start
│   ├── onTick()        ← Timer callback
│   ├── createContext()  ← Factory for per-request Context
│   └── httpCall()      ← Async HTTP dispatch
│
└── Context             ← Per-request, created by RootContext
    ├── onRequestHeaders()    → FilterHeadersStatusValues
    ├── onRequestBody()       → FilterDataStatusValues
    ├── onRequestTrailers()   → FilterTrailersStatusValues
    ├── onResponseHeaders()   → FilterHeadersStatusValues
    ├── onResponseBody()      → FilterDataStatusValues
    ├── onResponseTrailers()  → FilterTrailersStatusValues
    ├── onLog()               ← After response complete
    └── onNewConnection()     ← TCP filter (rare)
```

Users extend both classes, override the hooks they need, and return status values to control request flow (Continue, StopIteration, etc.).

### Registration Pattern

```typescript
registerRootContext(
  (context_id: u32) => new MyRoot(context_id),
  "myApp"
);
```

The factory function is called once. `createContext()` on the root is called per-request to create `Context` instances.

### StreamContext — Header Access

The `stream_context` global provides header manipulation during lifecycle hooks:

```typescript
stream_context.headers.request    // HeaderStreamManipulator
stream_context.headers.response   // HeaderStreamManipulator
stream_context.trailers.request   // HeaderStreamManipulator
stream_context.trailers.response  // HeaderStreamManipulator
```

**HeaderStreamManipulator methods:**

| Method | Description |
|--------|-------------|
| `get(key)` | Read header value (returns `string`) |
| `add(key, value)` | Add header (allows duplicates) |
| `replace(key, value)` | Replace header value (no-op if missing) |
| `remove(key)` | Delete header |
| `get_headers()` | Get all headers as `Array<HeaderPair>` |
| `set_headers(headers)` | Replace all headers |

### Key Enums

| Enum | Values | Used By |
|------|--------|---------|
| `FilterHeadersStatusValues` | Continue, StopIteration, ContinueAndEndStream, StopAllIterationAndBuffer, StopAllIterationAndWatermark | `onRequestHeaders`, `onResponseHeaders` |
| `FilterDataStatusValues` | Continue, StopIterationAndBuffer, StopIterationAndWatermark, StopIterationNoBuffer | `onRequestBody`, `onResponseBody` |
| `FilterTrailersStatusValues` | Continue, StopIteration | `onRequestTrailers`, `onResponseTrailers` |
| `LogLevelValues` | trace, debug, info, warn, error, critical | `log()` |
| `WasmResultValues` | Ok, NotFound, BadArgument, ..., Unimplemented | All host call returns |

### Helper Functions

Key functions exported from `runtime.ts`:

| Function | Description |
|----------|-------------|
| `log(level, message)` | Log at specified level |
| `send_local_response(code, details, body, headers, grpc_status)` | Send synthetic response, bypass upstream |
| `send_http_response(code, details, body, headers)` | Convenience wrapper for `send_local_response` |
| `get_property(path)` | Read runtime property (geo, IP, etc.) |
| `set_property(path, data)` | Write runtime property |
| `continue_request()` / `continue_response()` | Resume paused stream |
| `get_buffer_bytes(type, start, length)` | Read request/response body buffer |
| `set_buffer_bytes(type, start, length, value)` | Write to body buffer |

---

## FastEdge Layer (`assembly/fastedge/`)

### Modules

| Module | Exports | Host Functions Used |
|--------|---------|---------------------|
| `dictionary.ts` | `getEnv(name)`, `getDictionary(name)` | WASI `process.env`, `proxy_dictionary_get` |
| `env.ts` | `getEnvVar(name)` (deprecated) | WASI `process.env` |
| `secrets.ts` | `getSecret(name)`, `getSecretEffectiveAt(name, slot)` | `proxy_get_secret`, `proxy_get_effective_at_secret` |
| `kvStore.ts` | `KvStore` class, `ValueScoreTuple` | `proxy_kv_store_*` (6 functions) |
| `utils/runtime.ts` | `getCurrentTime()`, `setLogLevel()`, `log()` | `get_current_time_nanoseconds` |
| `utils/listParser.ts` | `parseBufferToList<T>()`, `ItemParser<T>` | (internal — deserializes multi-value host responses) |

### KvStore Class

```typescript
const store = KvStore.open("myStore");       // Returns KvStore | null
const value = store!.get("key");             // Returns ArrayBuffer | null
const keys = store!.scan("prefix*");         // Returns Array<string>
const results = store!.zrangeByScore("key", 0.0, 100.0);  // Array<ValueScoreTuple>
const matches = store!.zscan("key", "pat*"); // Array<ValueScoreTuple>
const exists = store!.bfExists("bloom", "item");  // boolean
```

### Size Limits

| API | Limit | When to Use |
|-----|-------|-------------|
| `getEnv()` (WASI process.env) | 64 KB | Default for environment variables |
| `getDictionary()` (host API) | 2 MB | For values exceeding 64 KB |

---

## Memory Management

### ArrayBufferReference

Host calls return data through `ArrayBufferReference` in `runtime.ts`. The global `globalArrayBufferReference` is reused across calls.

**Critical rule:** `toArrayBuffer()` must be called exactly once after a host call — it transfers ownership of the host-allocated buffer and calls `free()` on the raw pointer.

### malloc/free

`malloc.ts` provides the allocator that the host uses to allocate buffers in wasm memory:

```typescript
export function malloc(size: i32): usize {
  let buffer = new ArrayBuffer(size);
  return __pin(changetype<usize>(buffer));  // Pin for host use
}

export function free(ptr: usize): void {
  __unpin(ptr);  // Release to GC
}
```

The host calls `malloc` to allocate space for return values, writes data into it, then the SDK reads and frees it. This is safe because wasm is single-threaded.

---

**Last Updated**: April 2026
