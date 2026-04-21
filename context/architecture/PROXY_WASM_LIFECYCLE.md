# Proxy-Wasm Lifecycle

## Overview

The proxy-wasm ABI defines a host↔wasm contract. The host (FastEdge CDN proxy) calls exported wasm functions at specific lifecycle points. The SDK's `exports.ts` implements these entry points and dispatches to user-defined `RootContext` and `Context` subclasses.

> **FastEdge vs canonical proxy-wasm:** this SDK targets the FastEdge CDN runtime, which differs from canonical Envoy proxy-wasm in two ways that directly affect guest code:
> 1. **Hook state isolation** — Context instances do not persist across different lifecycle hooks (covered in `SDK_ARCHITECTURE.md` → Hook State Isolation).
> 2. **HTTP call resume model** — after an outbound `httpCall` response, the runtime re-invokes the originating hook rather than continuing the stream at the next phase (covered in "Async HTTP Callbacks" below).
>
> Guest code written against generic proxy-wasm tutorials will not work correctly on FastEdge without accounting for both.

---

## VM Lifecycle

These run once per VM instance (or on config reload):

```
proxy_on_vm_start(root_context_id, config_size)
  → RootContext.onStart(config_size)
  → Returns 1 (success) or 0 (failure)

proxy_on_configure(root_context_id, config_size)
  → RootContext.onConfigure(config_size)
  → Returns 1 (success) or 0 (failure)

proxy_on_tick(root_context_id)
  → RootContext.onTick()
  → Called at interval set by proxy_set_tick_period_milliseconds()
```

---

## Request Lifecycle

For each HTTP request, the host creates a Context and calls hooks in order:

### Phase 1: Context Creation

```
proxy_on_context_create(context_id, root_context_id)
  → ensureContext() → RootContext.createContext()
  → User returns new MyContext(context_id, this)
```

### Phase 2: Request Processing

```
proxy_on_request_headers(context_id, headers, end_of_stream)
  → Context.onRequestHeaders(headers, end_of_stream)
  → Returns FilterHeadersStatusValues
    Continue           → proceed to body/upstream
    StopIteration      → pause, wait for continueRequest()
    StopAllIterationAndBuffer → buffer all body chunks

proxy_on_request_body(context_id, body_length, end_of_stream)
  → Context.onRequestBody(body_length, end_of_stream)
  → Returns FilterDataStatusValues
    Continue              → forward body chunk
    StopIterationAndBuffer → accumulate, wait for more

proxy_on_request_trailers(context_id, trailers)
  → Context.onRequestTrailers(trailers)
  → Returns FilterTrailersStatusValues
```

### Phase 3: Response Processing

```
proxy_on_response_headers(context_id, headers, end_of_stream)
  → Context.onResponseHeaders(headers, end_of_stream)
  → Returns FilterHeadersStatusValues

proxy_on_response_body(context_id, body_length, end_of_stream)
  → Context.onResponseBody(body_length, end_of_stream)
  → Returns FilterDataStatusValues

proxy_on_response_trailers(context_id, trailers)
  → Context.onResponseTrailers(trailers)
  → Returns FilterTrailersStatusValues
```

### Phase 4: Finalization

```
proxy_on_log(context_id)
  → Context.onLog()
  → Called after response complete
  → Headers/body readable but immutable

proxy_on_done(context_id)
  → Context.onDone() or RootContext.onDone()
  → Returns true (done) or false (async work pending)

proxy_on_delete(context_id)
  → Context.onDelete() or RootContext.onDelete()
  → Final cleanup
```

---

## Async HTTP Callbacks

The FastEdge runtime uses a **host-driven resume model** for outbound HTTP calls. This is not canonical proxy-wasm behavior and is load-bearing for correctness.

### Dispatch and Resume Flow

1. A lifecycle hook (typically `onRequestHeaders`) calls `httpCall(cluster, headers, body, trailers, timeout_ms, origin_context, cb)` on the `RootContext`. The SDK stores `cb` keyed by an HTTP call token in `root_context.http_calls_`.
2. The hook returns a pause value (`FilterHeadersStatusValues.StopIteration` or similar).
3. The host awaits the HTTP response.
4. On response, the host invokes `proxy_on_http_call_response(context_id, token, headers, body_size, trailers)`. The SDK's base `RootContext.onHttpCallResponse`:
   - Looks up the stored callback by token.
   - Calls `proxy_set_effective_context(origin_context.context_id)` so that `stream_context.headers.http_callback.get(...)` and `get_buffer_bytes(HttpCallResponseBody, ...)` resolve against the originating request's scope.
   - Invokes `cb(origin_context, headers, body_size, trailers)`.
5. **The host then re-invokes the same lifecycle hook** (e.g. `onRequestHeaders`) on the same `Context` instance.
6. The hook must return `Continue` to proceed, or it can dispatch another call and return a pause value again.

### Required Pattern: Latch Field + Named Callback

Because step 5 re-fires the same hook, every hook that dispatches `httpCall` must guard re-dispatch with an instance-field latch. Without it, the hook dispatches a new HTTP call on every re-entry and the request loops until timeout.

Prefer a named module-level function for the `cb` argument over an anonymous arrow. Named functions cannot close over mutable state, which is structurally safer under AssemblyScript's closure restrictions and keeps the dispatch call site readable.

```typescript
function onUpstreamResponse(
  ctx: BaseContext,
  hdrs: u32,
  bodySize: usize,
  trls: u32,
): void {
  // Read response via stream_context.headers.http_callback
  // and get_buffer_bytes(BufferTypeValues.HttpCallResponseBody, ...).
  // Downcast `ctx as MyContext` if Context state is needed.
}

class MyContext extends Context {
  httpCallDispatched: bool = false;

  onRequestHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
    if (this.httpCallDispatched) {
      return FilterHeadersStatusValues.Continue;
    }

    const result = (this.root_context as MyRoot).httpCall(
      "example.com",
      headers,
      new ArrayBuffer(0),
      [],
      1000,
      this,
      onUpstreamResponse,
    );
    if (result != WasmResultValues.Ok) { /* handle dispatch failure */ }

    this.httpCallDispatched = true;
    return FilterHeadersStatusValues.StopIteration;
  }
}
```

### Interaction with Hook State Isolation

Instance fields on a `Context` do **not** persist across different lifecycle hooks (e.g. `onRequestHeaders` → `onResponseHeaders` run on different servers — see `SDK_ARCHITECTURE.md` → Hook State Isolation). They **do** persist across the re-invocation in step 5 because it is the same hook on the same `Context` within a single wasm invocation chain. The latch pattern above depends on this narrower guarantee.

If you need state to survive across hooks (e.g. remember in `onResponseHeaders` that an HTTP call happened during `onRequestHeaders`), use `set_property` / `get_property`.

### `continueRequest()` is Ceremonial

`BaseContext.continueRequest()` wraps `proxy_continue_stream`, which is a no-op on the FastEdge runtime. Resume is implicit via hook re-invocation; calling `continueRequest()` has no observable effect. The only guest-side signal that affects the pause loop is `proxy_close_stream`, which aborts with 503.

### Override Patterns to Avoid

- **Do not override `RootContext.onHttpCallResponse`** unless you also call `super.onHttpCallResponse(token, headers, body_size, trailers)`. Overriding without `super` skips the token→callback lookup and `setEffectiveContext` call, breaking the per-Context response routing the SDK provides.
- **Do not mirror `Context`-level `on_http_call_response` overrides from the Rust SDK** — the AS SDK dispatches `proxy_on_http_call_response` to the singleton root, not to per-request contexts. Use the `cb` argument to `httpCall` to reach per-Context logic.

---

## gRPC Callbacks

For gRPC streams and calls:

```
proxy_on_grpc_receive_initial_metadata(context_id, token, headers)
proxy_on_grpc_receive(context_id, token, response_size)
proxy_on_grpc_trailing_metadata(context_id, token, trailers)
proxy_on_grpc_close(context_id, token, status_code)
```

---

## Dispatch Mechanism (`exports.ts`)

The dispatch works through two maps maintained in `runtime.ts`:

- `root_context_map: Map<u32, RootContext>` — root contexts by ID
- `context_map: Map<u32, Context>` — per-request contexts by ID

Each `proxy_on_*` export:
1. Looks up the context by `context_id`
2. Calls the corresponding method on the user's subclass
3. Returns the status value to the host

Example flow:
```
Host calls: proxy_on_request_headers(42, 5, 0)
  → exports.ts looks up context_map[42]
  → Calls context.onRequestHeaders(5, false)
  → User code inspects headers, maybe modifies them
  → Returns FilterHeadersStatusValues.Continue
  → Host proceeds to body phase
```

---

## Short-Circuiting with Local Response

At any point during request/response processing, the app can send a synthetic response:

```typescript
send_local_response(403, "Forbidden", body, headers, -1);
```

This bypasses the upstream entirely. The response goes directly to the client.

---

## Timer Ticks

`RootContext` can set a periodic timer:

```typescript
// In onStart or onConfigure:
proxy_set_tick_period_milliseconds(30000); // 30 seconds

// Called periodically:
onTick(): void {
  // background work
}
```

---

## Context ID Mapping

- Root context IDs are provided by the host at VM start
- Per-request context IDs are assigned by the host for each new request
- `proxy_set_effective_context(id)` switches the "current" context for header/buffer operations during callbacks

---

**Last Updated**: April 2026
