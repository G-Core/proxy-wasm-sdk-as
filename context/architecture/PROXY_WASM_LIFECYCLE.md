# Proxy-Wasm Lifecycle

## Overview

The proxy-wasm ABI defines a host↔wasm contract. The host (FastEdge CDN proxy) calls exported wasm functions at specific lifecycle points. The SDK's `exports.ts` implements these entry points and dispatches to user-defined `RootContext` and `Context` subclasses.

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

When `RootContext.httpCall()` makes an async HTTP request:

1. The current request is paused
2. When the response arrives, the host calls:

```
proxy_on_http_call_response(context_id, token, headers, body_size, trailers)
  → RootContext.onHttpCallResponse(token, headers, body_size, trailers)
  → Or the callback passed to httpCall()
```

The `httpCall` method accepts a callback function:

```typescript
this.httpCall(
  "cluster_name",
  headers,
  body,
  trailers,
  timeout_ms,
  this,                    // origin context
  (ctx, hdrs, body, trl) => {
    // handle response
    ctx.continueRequest(); // resume original request
  }
);
```

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
