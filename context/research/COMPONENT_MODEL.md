# WebAssembly Component Model Migration Research

> **Date**: 2026-04-16
> **Status**: Research / exploration phase
> **Goal**: Evaluate feasibility of turning proxy-wasm-sdk-as into a Component Model library

---

## Table of Contents

- [Background](#background)
- [Why AssemblyScript Cannot Produce Components](#why-assemblyscript-cannot-produce-components)
- [The Post-Build Wrapping Approach](#the-post-build-wrapping-approach-the-viable-path)
- [WIT World Definition (Draft)](#wit-world-definition-draft)
- [Canonical ABI Glue Code Patterns](#canonical-abi-glue-code-patterns)
- [Proxy-Wasm Community Status](#proxy-wasm-community-status)
- [How Other Languages Did It](#how-other-languages-did-it)
- [Current SDK Surface Area](#current-sdk-surface-area)
- [Practical Recommendations](#practical-recommendations)
- [Open Questions](#open-questions)
- [References](#references)

---

## Background

The proxy-wasm-sdk-as SDK compiles to a **core WebAssembly module** using the AssemblyScript compiler (`asc` + Binaryen backend). It exposes 47 host imports and 24 guest exports implementing the proxy-wasm ABI v0.2.1, plus FastEdge-specific extensions (dictionary, secrets, KV store).

The WebAssembly **Component Model** is a higher-level abstraction over core wasm that adds:
- **WIT (WebAssembly Interface Types)** — an IDL for defining typed interfaces
- **Canonical ABI** — a standard calling convention for passing strings, lists, records, variants, etc. across component boundaries
- **Composability** — components can be linked together without shared memory

Migrating to the Component Model would allow:
- Formal interface contracts (WIT files) replacing ad-hoc C-style pointer passing
- Interoperability with any language that targets the Component Model
- Alignment with WASI Preview 2 and the broader wasm ecosystem direction
- Potential reuse of standard WASI interfaces (`wasi:http`, `wasi:keyvalue`, `wasi:logging`)

---

## Why AssemblyScript Cannot Produce Components

### 1. Philosophical opposition from the AS team

The AssemblyScript team has published formal [Standards Objections](https://www.assemblyscript.org/standards-objections.html). Their position:
- The Component Model "cements WASI's preferences" at the expense of the web platform
- The canonical ABI "needlessly biases WebAssembly against the Web platform in favor of C++ and Rust"
- It "only supports one family of programming languages"

In GitHub issue [assemblyscript#2966](https://github.com/AssemblyScript/assemblyscript/issues/2966) (January 2026), a core contributor stated Component Model support would be "within the bottom 1/3 or 1/4 of my todo list for AS." This position is unlikely to change.

### 2. Compiler architecture

The `asc` compiler uses **Binaryen** as its backend, which emits core wasm modules only. It has no concept of WIT interfaces, the canonical ABI, or component-level types. Adding component output would require either modifying Binaryen or adding a post-Binaryen transformation step — neither of which the team intends to do.

### 3. Memory model mismatch (the core technical gap)

The canonical ABI expects raw `(pointer, byte_length)` pairs in linear memory with no metadata. AssemblyScript's runtime wraps every heap object in a **20-byte managed header** (containing `rtId` and `rtSize` for GC tracking). You cannot pass an AS string pointer directly across a component boundary.

| Requirement | Canonical ABI | AssemblyScript |
|---|---|---|
| **String encoding** | UTF-8 (default), UTF-16, Latin1+UTF-16 | WTF-16 (JS-compatible, allows unpaired surrogates) |
| **String layout** | Raw `(ptr, byte_len)` — no headers | 20-byte managed header before payload |
| **Memory allocator** | Must export `cabi_realloc(old_ptr, old_size, align, new_size) -> ptr` | TLSF-based managed allocator; `malloc` returns pinned managed objects |
| **Lists/records** | C-struct-like flat layout in linear memory | Managed objects with GC headers |
| **Resource handles** | i32 handle table | Maps to `u32`, needs explicit lifecycle management |

### 4. No wit-bindgen support

`wit-bindgen` supports Rust, C/C++, Go, C#, and MoonBit. **AssemblyScript is not supported.** Open issue [wit-bindgen#537](https://github.com/bytecodealliance/wit-bindgen/issues/537) has no activity.

### 5. Enhancing or forking the compiler is not viable

- **Enhance upstream**: Blocked by team's philosophical position and limited resources
- **Fork**: Theoretically possible but carries heavy maintenance burden against a moving upstream target. Not recommended.

---

## The Post-Build Wrapping Approach (The Viable Path)

This is how other managed-memory languages (TinyGo, MoonBit) achieved Component Model support. The pattern:

```
                    +----------------+
   WIT files ------| codegen tool   |---- generates AS glue code
                    +-------+--------+    (cabi_realloc, marshal/unmarshal,
                            |              correctly-named exports)
                            v
                    +----------------+
   your AS code ---|  asc compiler  |---- core wasm module
   + glue code      +-------+--------+
                            |
                            v
                    +------------------------+
                    | wasm-tools component   |
                    |   embed + new          |---- final .wasm component
                    +------------------------+
```

### Step 1: Write WIT world definitions

Define WIT interfaces covering the full proxy-wasm ABI + FastEdge extensions. See [WIT World Definition (Draft)](#wit-world-definition-draft) below.

### Step 2: Build a "componentize-as" codegen tool

A tool that reads WIT files and generates AssemblyScript glue code:

- **`cabi_realloc` export** — bypasses AS managed runtime, uses raw `heap.alloc`/`heap.free`
- **String marshaling** — copies between AS managed strings (WTF-16 with headers) and canonical ABI buffers (raw pointer + byte length)
- **List/record marshaling** — copies between AS managed arrays and flat canonical ABI layout
- **Correctly-named exports** matching the WIT world (e.g., `gcore:fastedge/filter@0.1.0#on-request-headers`)
- **Import wrappers** that translate canonical ABI calling conventions into AS-friendly types

### Step 3: Compile and wrap

```bash
# 1. Compile AS (including generated glue) to core wasm
asc assembly/index.ts -o build/filter.wasm --exportRuntime

# 2. Embed WIT metadata (use utf16 to minimize string transcoding)
wasm-tools component embed --encoding utf16 \
    --world fastedge-filter \
    wit/ build/filter.wasm -o build/filter.embedded.wasm

# 3. Produce final component (with WASI adapter if needed)
wasm-tools component new \
    build/filter.embedded.wasm \
    --adapt wasi_snapshot_preview1.reactor.wasm \
    -o build/filter.component.wasm
```

### Key technical challenges

1. **String marshaling overhead**: Every string crossing a component boundary requires a copy (cannot pass managed AS strings directly). Using `--encoding utf16` during embed minimizes transcoding but the header-stripping copy is unavoidable.

2. **`cabi_realloc` implementation**: Must use `heap.alloc`/`heap.free` (unmanaged), not the AS managed allocator. The managed allocator prepends GC headers that would corrupt canonical ABI data.

3. **MAX_FLAT_PARAMS / MAX_FLAT_RESULTS**: Functions with more than 16 params must use pointer-based calling convention (params passed via a struct in linear memory). Functions with more than 1 result use a return-pointer parameter. Generated glue must handle both cases.

4. **Resource handles**: Canonical ABI uses an i32 handle table with explicit `drop` semantics. Maps well to the existing `KvStore` handle pattern in the SDK.

---

## WIT World Definition (Draft)

This is a starting-point sketch covering the major API surfaces. A complete version would need to cover all 24 export callbacks and the full import surface including gRPC, metrics, shared data/queue, and timing.

```wit
package gcore:fastedge@0.1.0;

// ===== Core proxy-wasm interfaces =====

interface logging {
    enum log-level {
        trace,
        debug,
        info,
        warn,
        error,
        critical,
    }

    log: func(level: log-level, message: string);
    get-log-level: func() -> log-level;
}

interface headers {
    enum header-map-type {
        request-headers,
        request-trailers,
        response-headers,
        response-trailers,
        grpc-receive-initial-metadata,
        grpc-receive-trailing-metadata,
        http-call-response-headers,
        http-call-response-trailers,
    }

    type header-pair = tuple<string, string>;

    get-header-map-value: func(map-type: header-map-type, key: string) -> option<string>;
    add-header-map-value: func(map-type: header-map-type, key: string, value: string);
    replace-header-map-value: func(map-type: header-map-type, key: string, value: string);
    remove-header-map-value: func(map-type: header-map-type, key: string);
    get-header-map-pairs: func(map-type: header-map-type) -> list<header-pair>;
    set-header-map-pairs: func(map-type: header-map-type, pairs: list<header-pair>);
    get-header-map-size: func(map-type: header-map-type) -> u32;
}

interface buffers {
    enum buffer-type {
        http-request-body,
        http-response-body,
        downstream-data,
        upstream-data,
        http-call-response-body,
        grpc-receive-buffer,
        vm-configuration,
        plugin-configuration,
        call-data,
    }

    get-buffer-bytes: func(buf-type: buffer-type, start: u32, length: u32) -> option<list<u8>>;
    set-buffer-bytes: func(buf-type: buffer-type, start: u32, length: u32, data: list<u8>);
    get-buffer-status: func(buf-type: buffer-type) -> tuple<u32, u32>;
}

interface properties {
    get-property: func(path: string) -> option<list<u8>>;
    set-property: func(path: string, value: list<u8>);
}

interface stream-control {
    enum stream-type {
        request,
        response,
        downstream,
        upstream,
    }

    continue-stream: func(s: stream-type);
    close-stream: func(s: stream-type);
    send-local-response: func(
        status-code: u32,
        headers: list<tuple<string, string>>,
        body: list<u8>,
        grpc-status: u32,
    );
    clear-route-cache: func();
}

interface timing {
    set-tick-period: func(milliseconds: u32);
    get-current-time-nanoseconds: func() -> u64;
}

interface http-call {
    make-http-call: func(
        uri: string,
        headers: list<tuple<string, string>>,
        body: list<u8>,
        trailers: list<tuple<string, string>>,
        timeout-ms: u32,
    ) -> result<u32, u32>;
}

interface shared-data {
    get-shared-data: func(key: string) -> option<tuple<list<u8>, u32>>;
    set-shared-data: func(key: string, value: list<u8>, cas: u32) -> result;
}

interface shared-queue {
    register-shared-queue: func(queue-name: string) -> result<u32>;
    resolve-shared-queue: func(vm-id: string, queue-name: string) -> result<u32>;
    dequeue-shared-queue: func(token: u32) -> option<list<u8>>;
    enqueue-shared-queue: func(token: u32, data: list<u8>) -> result;
}

interface metrics {
    enum metric-type {
        counter,
        gauge,
        histogram,
    }

    define-metric: func(metric-type: metric-type, name: string) -> result<u32>;
    increment-metric: func(metric-id: u32, offset: s64);
    record-metric: func(metric-id: u32, value: u64);
    get-metric: func(metric-id: u32) -> u64;
}

interface grpc {
    grpc-call: func(
        service: string,
        service-name: string,
        method-name: string,
        request: list<u8>,
        timeout-ms: u32,
    ) -> result<u32>;

    grpc-stream: func(
        service: string,
        service-name: string,
        method-name: string,
    ) -> result<u32>;

    grpc-cancel: func(token: u32);
    grpc-close: func(token: u32);
    grpc-send: func(token: u32, message: list<u8>, end-stream: bool);
}

interface foreign-function {
    call-foreign-function: func(function-name: string, arguments: list<u8>) -> option<list<u8>>;
}

interface context-control {
    set-effective-context: func(context-id: u32);
    done: func();
}

// ===== FastEdge-specific interfaces =====

interface dictionary {
    /// Read an environment variable / dictionary value (no size limit).
    get-env: func(name: string) -> option<string>;
}

interface secrets {
    /// Read a secret by name.
    get-secret: func(name: string) -> option<string>;

    /// Read a secret from a specific rotation slot.
    get-secret-effective-at: func(name: string, slot: u32) -> option<string>;
}

interface kv-store {
    type value-score-tuple = tuple<list<u8>, f64>;

    /// Open a named KV store, returns a handle.
    open: func(store-name: string) -> option<u32>;

    /// Get a value by key.
    get: func(handle: u32, key: string) -> option<list<u8>>;

    /// Scan keys matching a glob pattern (must contain wildcard).
    scan: func(handle: u32, pattern: string) -> list<string>;

    /// Sorted set range query by score.
    zrange-by-score: func(handle: u32, key: string, min: f64, max: f64) -> list<value-score-tuple>;

    /// Sorted set scan by pattern.
    zscan: func(handle: u32, key: string, pattern: string) -> list<value-score-tuple>;

    /// Bloom filter existence check.
    bf-exists: func(handle: u32, key: string, item: string) -> bool;
}

// ===== Filter status enums for exports =====

interface filter-types {
    enum filter-headers-status {
        continue-iteration,
        stop-iteration,
        continue-and-end-stream,
        stop-all-iteration-and-buffer,
        stop-all-iteration-and-watermark,
    }

    enum filter-data-status {
        continue-iteration,
        stop-iteration-and-buffer,
        stop-iteration-and-watermark,
        stop-iteration-no-buffer,
    }

    enum filter-trailers-status {
        continue-iteration,
        stop-iteration,
    }

    enum filter-status {
        continue-iteration,
        stop-iteration,
    }

    enum peer-type {
        unknown,
        local,
        remote,
    }

    enum grpc-status {
        ok,
        canceled,
        unknown,
        invalid-argument,
        deadline-exceeded,
        not-found,
        already-exists,
        permission-denied,
        resource-exhausted,
        failed-precondition,
        aborted,
        out-of-range,
        unimplemented,
        internal,
        unavailable,
        data-loss,
        unauthenticated,
    }
}

// ===== The world =====

world fastedge-filter {
    // Host-provided APIs (imports)
    import logging;
    import headers;
    import buffers;
    import properties;
    import stream-control;
    import timing;
    import http-call;
    import shared-data;
    import shared-queue;
    import metrics;
    import grpc;
    import foreign-function;
    import context-control;
    import dictionary;
    import secrets;
    import kv-store;

    // Use standard filter types
    use filter-types.{
        filter-headers-status,
        filter-data-status,
        filter-trailers-status,
        filter-status,
        peer-type,
        grpc-status,
    };

    // Guest-provided callbacks (exports) — VM lifecycle
    export on-vm-start: func(config-size: u32) -> bool;
    export on-configure: func(config-size: u32) -> bool;
    export on-tick: func();
    export on-queue-ready: func(token: u32);
    export on-done: func() -> bool;
    export on-delete: func();
    export on-foreign-function: func(function-id: u32, data-size: u32);

    // Guest-provided callbacks (exports) — context lifecycle
    export on-context-create: func(context-id: u32, root-context-id: u32);

    // Guest-provided callbacks (exports) — HTTP filter
    export on-request-headers: func(num-headers: u32, end-of-stream: bool) -> filter-headers-status;
    export on-request-body: func(body-size: u32, end-of-stream: bool) -> filter-data-status;
    export on-request-trailers: func(num-trailers: u32) -> filter-trailers-status;
    export on-response-headers: func(num-headers: u32, end-of-stream: bool) -> filter-headers-status;
    export on-response-body: func(body-size: u32, end-of-stream: bool) -> filter-data-status;
    export on-response-trailers: func(num-trailers: u32) -> filter-trailers-status;

    // Guest-provided callbacks (exports) — network filter
    export on-new-connection: func() -> filter-status;
    export on-downstream-data: func(data-size: u32, end-of-stream: bool) -> filter-status;
    export on-upstream-data: func(data-size: u32, end-of-stream: bool) -> filter-status;
    export on-downstream-connection-close: func(peer: peer-type);
    export on-upstream-connection-close: func(peer: peer-type);

    // Guest-provided callbacks (exports) — async responses
    export on-http-call-response: func(token: u32, num-headers: u32, body-size: u32, num-trailers: u32);
    export on-grpc-receive-initial-metadata: func(token: u32, num-headers: u32);
    export on-grpc-receive-trailing-metadata: func(token: u32, num-trailers: u32);
    export on-grpc-receive: func(token: u32, response-size: u32);
    export on-grpc-close: func(token: u32, status: grpc-status);

    // Guest-provided callbacks (exports) — logging
    export on-log: func();
}
```

### Notes on the WIT draft

- **Simplification vs proxy-wasm ABI**: The current C-style ABI uses raw pointers, error codes, and manual serialization. WIT replaces this with `option<T>`, `result`, `list<T>`, and `string` — the canonical ABI handles serialization automatically.
- **Context management**: The current ABI uses `context_id` parameters on every callback. A Component Model design might use resources or a different dispatch pattern. This draft keeps context IDs for parity but this is worth revisiting.
- **WASI overlap**: `logging`, `kv-store`, and parts of `http-call` overlap with `wasi:logging`, `wasi:keyvalue`, and `wasi:http`. A production design should evaluate adopting those standard interfaces where possible.
- **Metadata callbacks**: `on-request-metadata` and `on-response-metadata` are omitted — they return `FilterMetadataStatus` which is always `Continue` in the current SDK and rarely used in practice.

---

## Canonical ABI Glue Code Patterns

These are the key patterns a "componentize-as" codegen tool would need to generate.

### `cabi_realloc` — raw memory allocation bypassing AS runtime

```typescript
// Must use heap.alloc (unmanaged), NOT __new (managed with GC headers)
export function cabi_realloc(
    old_ptr: usize, old_size: usize, _align: usize, new_size: usize
): usize {
    if (new_size == 0) {
        if (old_ptr != 0) heap.free(old_ptr);
        return 0;
    }
    if (old_ptr == 0) return heap.alloc(new_size);
    let new_ptr = heap.alloc(new_size);
    let copy_size = old_size < new_size ? old_size : new_size;
    memory.copy(new_ptr, old_ptr, copy_size);
    heap.free(old_ptr);
    return new_ptr;
}
```

### String lowering — AS managed string to canonical ABI buffer

```typescript
// AS string -> canonical ABI (UTF-16, no managed header)
// Returns (ptr, byte_length) where ptr is a raw heap pointer
function lower_string(s: string): usize {
    let byte_len: usize = <usize>s.length << 1;  // UTF-16: 2 bytes per code unit
    let ptr = heap.alloc(byte_len);
    // AS string data starts at changetype<usize>(s), skip managed header
    memory.copy(ptr, changetype<usize>(s), byte_len);
    return ptr;  // byte_len stored separately by calling convention
}
```

### String lifting — canonical ABI buffer to AS managed string

```typescript
// Canonical ABI buffer -> AS managed string
function lift_string(ptr: usize, byte_len: usize): string {
    // __new allocates a managed object with the correct rtId
    let s = changetype<usize>(__new(byte_len, idof<string>()));
    memory.copy(s, ptr, byte_len);
    return changetype<string>(s);
}
```

### List lowering/lifting follows the same pattern

Copy between AS managed `Array<T>` (with GC headers) and flat canonical ABI layout `(ptr, count)` where elements are packed contiguously.

### Export wrapper example

```typescript
// WIT: on-request-headers: func(num-headers: u32, end-of-stream: bool) -> filter-headers-status
// The component export must match the canonical naming convention
export function gcore_fastedge_on_request_headers(num_headers: u32, end_of_stream: u32): u32 {
    // Dispatch to the user's Context.onRequestHeaders
    // (matches existing proxy_on_request_headers logic in exports.ts)
    let ctx = getContext(current_context_id);
    let result = ctx.onRequestHeaders(num_headers, end_of_stream != 0);
    return <u32>result;
}
```

---

## Proxy-Wasm Community Status

### Official roadmap

The proxy-wasm spec has a [roadmap PR (#74)](https://github.com/proxy-wasm/spec/pull/74) that states:

> **(Help wanted) WASI convergence.** We want to adopt the component model at WASI 1.0. There is a lot of overlap between Proxy-Wasm and some WASI proposals (wasi-http, wasi-keyvalue, etc). In the short term, we'd like to define the Proxy-Wasm ABI in WIT [...]

Marked "Help wanted" with no owner or ETA — aspirational, not actively developed.

### No existing WIT definitions

There are **no published WIT files** defining the proxy-wasm interface anywhere in the community. The WIT draft in this document is original work.

### vNEXT spec

The proxy-wasm `vNEXT` spec (work-in-progress) includes `wasi_snapshot_preview1` functions but has **no references to the Component Model or WIT**. It focuses on incremental improvements to the existing core-module-based ABI.

### Envoy situation

Envoy is the primary consumer of proxy-wasm. In [envoyproxy/envoy#35420](https://github.com/envoyproxy/envoy/issues/35420), community members raised concerns that the proxy-wasm spec appears stagnant. A former maintainer suggested eliminating the proxy-wasm organization dependency and making Envoy self-contained. No public plan for Envoy to migrate to the Component Model.

### NGINX Unit precedent

NGINX Unit v1.32.0 (2024) replaced its earlier wasm approach with full Component Model support using the `wasi:http/proxy` world. They deprecated their old core-module approach entirely. This demonstrates that a proxy runtime can successfully consume components, and is a useful reference.

### WASI overlap with proxy-wasm

| Proxy-wasm concept | WASI equivalent | Notes |
|---|---|---|
| Header manipulation | `wasi:http/types` | HTTP request/response types with headers |
| Body buffers | `wasi:http/types` incoming/outgoing-body | Stream-based in WASI vs buffer-based in proxy-wasm |
| KV store | `wasi:keyvalue` | Basic get/set; our sorted sets and bloom filters have no WASI equivalent |
| Logging | `wasi:logging` | Direct mapping |
| Outbound HTTP | `wasi:http/outgoing-handler` | More structured than proxy-wasm's `proxy_http_call` |
| Timers | No direct equivalent | `wasi:clocks` for time, but no tick/timer registration |
| Shared data/queue | No equivalent | Cross-VM communication is proxy-wasm-specific |
| Metrics | No standard equivalent | Some proposals exist |

---

## How Other Languages Did It

### Common pattern

Most languages followed this path:
1. Create a `wit-bindgen` code generator (or equivalent tool) for the language
2. The generator produces glue code: `cabi_realloc`, canonical ABI marshaling, correctly-named exports
3. Compile to a core wasm module
4. Use `wasm-tools component embed` + `wasm-tools component new` to produce the component

### Rust

Native support via `cargo component` and `wasm32-wasip2` target (stable since Rust 1.82). `wit-bindgen` generates code via procedural macros. The canonical ABI was designed largely with Rust/C memory models in mind, so Rust had the easiest path.

### C/C++

Uses `wit-bindgen` to generate C header/source/object files. Compiled with `wasm32-wasip2-clang` from the WASI SDK. Modern approach compiles directly to P2 components; legacy approach used `wasm-tools component new` to wrap P1 modules.

### TinyGo

TinyGo v0.34.0+ has native Component Model support with `-target=wasip2`. Under the hood, TinyGo invokes `wasm-tools` to embed WIT and componentize. Uses `wit-bindgen-go` for binding generation.

### MoonBit

Achieved Component Model support via the same hybrid approach: `wit-bindgen` generates MoonBit bindings, then `wasm-tools component embed` (with `--encoding utf16`) + `wasm-tools component new` for post-build componentization. Achieved remarkably small output: **27KB for an HTTP server component** (vs Rust's ~100KB). MoonBit is a managed-memory language like AssemblyScript, making it the closest reference for our situation.

---

## Current SDK Surface Area

These are the exact imports and exports that a WIT world must cover. Sourced from `assembly/imports.ts`, `assembly/exports.ts`, and `assembly/fastedge/`.

### Host imports (47 total)

**Status & logging (3):** `proxy_log`, `proxy_get_log_level`, `proxy_get_status`

**Timing & config (2):** `proxy_set_tick_period_milliseconds`, `proxy_get_current_time_nanoseconds`

**Properties (2):** `proxy_get_property`, `proxy_set_property`

**Stream control (4):** `proxy_continue_stream`, `proxy_close_stream`, `proxy_send_local_response`, `proxy_clear_route_cache`

**Shared data (2):** `proxy_get_shared_data`, `proxy_set_shared_data`

**Shared queue (4):** `proxy_register_shared_queue`, `proxy_resolve_shared_queue`, `proxy_dequeue_shared_queue`, `proxy_enqueue_shared_queue`

**Header manipulation (7):** `proxy_add_header_map_value`, `proxy_get_header_map_value`, `proxy_get_header_map_pairs`, `proxy_set_header_map_pairs`, `proxy_replace_header_map_value`, `proxy_remove_header_map_value`, `proxy_get_header_map_size`

**Buffer access (3):** `proxy_get_buffer_bytes`, `proxy_get_buffer_status`, `proxy_set_buffer_bytes`

**HTTP calls (1):** `proxy_http_call`

**gRPC (5):** `proxy_grpc_call`, `proxy_grpc_stream`, `proxy_grpc_cancel`, `proxy_grpc_close`, `proxy_grpc_send`

**Metrics (4):** `proxy_define_metric`, `proxy_increment_metric`, `proxy_record_metric`, `proxy_get_metric`

**System control (3):** `proxy_set_effective_context`, `proxy_done`, `proxy_call_foreign_function`

**FastEdge dictionary (1):** `proxy_dictionary_get`

**FastEdge secrets (2):** `proxy_get_secret`, `proxy_get_effective_at_secret`

**FastEdge KV store (6):** `proxy_kv_store_open`, `proxy_kv_store_get`, `proxy_kv_store_scan`, `proxy_kv_store_zrange_by_score`, `proxy_kv_store_zscan`, `proxy_kv_store_bf_exists`

### Guest exports (24 callbacks + 2 utility)

**VM lifecycle:** `proxy_abi_version_0_2_1`, `proxy_on_vm_start`, `proxy_on_configure`, `proxy_validate_configuration`, `proxy_on_tick`, `proxy_on_done`, `proxy_on_delete`, `proxy_on_foreign_function`, `proxy_on_queue_ready`, `proxy_on_log`

**Context lifecycle:** `proxy_on_context_create`

**HTTP filter:** `proxy_on_request_headers`, `proxy_on_request_body`, `proxy_on_request_trailers`, `proxy_on_request_metadata`, `proxy_on_response_headers`, `proxy_on_response_body`, `proxy_on_response_trailers`, `proxy_on_response_metadata`

**Network filter:** `proxy_on_new_connection`, `proxy_on_downstream_data`, `proxy_on_upstream_data`, `proxy_on_downstream_connection_close`, `proxy_on_upstream_connection_close`

**Async callbacks:** `proxy_on_http_call_response`, `proxy_on_grpc_receive_initial_metadata`, `proxy_on_grpc_trailing_metadata`, `proxy_on_grpc_receive`, `proxy_on_grpc_close`

**Memory:** `malloc` (for host to allocate guest memory)

---

## Practical Recommendations

### Approach comparison

| Approach | Feasibility | Effort | Risk |
|---|---|---|---|
| **Enhance AS compiler** | Blocked | N/A | AS team will not do it |
| **Fork AS compiler** | Possible but painful | Very high | Maintenance burden against moving upstream |
| **Post-build "componentize-as" tool** | Viable | 2-4 person-months (basic) | Canonical ABI evolution, marshaling overhead |
| **Rewrite SDK in Rust/Go** | Viable but breaks users | High | Migration cost for existing filter authors |
| **Dual-target: keep AS for core modules, offer Rust/Go for components** | Pragmatic | Medium | Maintaining two SDKs |

### Recommended next steps

1. **Near-term: Finalize the WIT world definition.** The draft above covers the full API surface. Validate it against the actual host runtime capabilities and refine types (e.g., should context IDs be explicit params or use resources?). This is valuable regardless of approach.

2. **Proof-of-concept: Hand-wire one example.** Take the `helloWorld` example, hand-write canonical ABI glue for just `on-request-headers` + `get-header-map-value`, and test whether `wasm-tools component new` produces a valid component that the server runtime can instantiate. This validates feasibility in days, not months.

3. **Server-side: Support both formats.** The FastEdge host runtime (presumably Wasmtime-based) can start accepting components alongside core modules. Wasmtime supports both. This allows incremental migration without breaking existing filters.

4. **Evaluate WASI interface reuse.** Where possible, adopt `wasi:http`, `wasi:keyvalue`, and `wasi:logging` instead of custom interfaces. This reduces the custom surface area and aligns with the ecosystem.

5. **Watch MoonBit closely.** Their approach (managed-memory language + `wit-bindgen` codegen + `wasm-tools` post-build) is exactly the pattern that would work for AS. Their implementation is the best reference available.

---

## Open Questions

- **Context dispatch model**: The current ABI passes `context_id` on every callback. Should the Component Model version use WIT resources to model contexts, or keep explicit IDs?
- **Server runtime readiness**: Does the FastEdge host runtime already support component instantiation (Wasmtime component API), or would server-side changes be needed too?
- **Performance budget**: What's the acceptable overhead for string/list marshaling at component boundaries? MoonBit's 27KB output suggests the code size cost is small, but runtime copying adds latency per call.
- **WASI adoption scope**: How much of the proxy-wasm ABI can be replaced by standard WASI interfaces vs. how much must remain custom (secrets, sorted set KV, bloom filters, shared queue, context management)?
- **Backward compatibility**: Would a component-based SDK still need to support the core-module ABI for existing deployments, or can we do a clean break?
- **Existing "componentize-*" tools**: Could we contribute an AS backend to the existing `wit-bindgen` project, or is a standalone tool more practical given the AS team's stance?

---

## References

- [WebAssembly Component Model spec](https://github.com/WebAssembly/component-model)
- [Canonical ABI explainer](https://github.com/WebAssembly/component-model/blob/main/design/mvp/CanonicalABI.md)
- [wit-bindgen — guest binding generators](https://github.com/bytecodealliance/wit-bindgen)
- [wit-bindgen AS issue (#537)](https://github.com/bytecodealliance/wit-bindgen/issues/537)
- [wasm-tools — component tooling](https://github.com/bytecodealliance/wasm-tools)
- [AssemblyScript Standards Objections](https://www.assemblyscript.org/standards-objections.html)
- [AssemblyScript Component Model discussion (#2966)](https://github.com/AssemblyScript/assemblyscript/issues/2966)
- [proxy-wasm spec roadmap PR (#74)](https://github.com/proxy-wasm/spec/pull/74)
- [Envoy proxy-wasm stagnation discussion (#35420)](https://github.com/envoyproxy/envoy/issues/35420)
- [NGINX Unit Component Model migration (v1.32.0)](https://unit.nginx.org/news/2024/unit-1.32.0-released/)
- [MoonBit Component Model support](https://www.moonbitlang.com/blog/component-model)
- [WASI Preview 2 spec](https://github.com/WebAssembly/WASI/blob/main/preview2/README.md)
