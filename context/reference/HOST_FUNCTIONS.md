# Host Function Reference

All host functions are declared in `assembly/imports.ts` as `@external("env", "<name>")`. They form the ABI boundary between the wasm module and the FastEdge CDN proxy host.

---

## Standard Proxy-Wasm ABI

### Logging & Status

| Function | Description |
|----------|-------------|
| `proxy_log(level, msg, msg_size)` | Log message at level (trace=0 through critical=5) |
| `proxy_get_log_level() → LogLevel` | Get current minimum log level |
| `proxy_get_status(status_code_ptr, msg_ptr, msg_size_ptr)` | Get status from last ABI call |

### Time & Timer

| Function | Description |
|----------|-------------|
| `proxy_get_current_time_nanoseconds(time_ptr)` | Current time in nanoseconds |
| `proxy_set_tick_period_milliseconds(period)` | Set onTick interval |

### Properties

| Function | Description |
|----------|-------------|
| `proxy_get_property(path, path_size, value_ptr, value_size_ptr)` | Read runtime property (geo, IP, URI, etc.) |
| `proxy_set_property(path, path_size, value, value_size)` | Write runtime property |

### Header Maps

| Function | Description |
|----------|-------------|
| `proxy_get_header_map_value(type, key, key_size, value_ptr, value_size_ptr)` | Read single header |
| `proxy_add_header_map_value(type, key, key_size, value, value_size)` | Add header (allows duplicates) |
| `proxy_replace_header_map_value(type, key, key_size, value, value_size)` | Replace header (no-op if missing) |
| `proxy_remove_header_map_value(type, key, key_size)` | Delete header |
| `proxy_get_header_map_pairs(type, ptr, size)` | Read all headers (serialized) |
| `proxy_set_header_map_pairs(type, ptr, size)` | Replace all headers |
| `proxy_get_header_map_size(type, size_ptr)` | Count of headers |

**Header map types:** RequestHeaders(0), RequestTrailers(1), ResponseHeaders(2), ResponseTrailers(3), HttpCallResponseHeaders(6), HttpCallResponseTrailers(7)

### Buffers

| Function | Description |
|----------|-------------|
| `proxy_get_buffer_bytes(type, start, length, ptr, size)` | Read buffer slice |
| `proxy_set_buffer_bytes(type, start, length, ptr, size)` | Write buffer slice |
| `proxy_get_buffer_status(type, length_ptr, flags_ptr)` | Get buffer length and flags |

**Buffer types:** HttpRequestBody(0), HttpResponseBody(1), HttpCallResponseBody(4), PluginConfiguration(7)

### Stream Control

| Function | Description |
|----------|-------------|
| `proxy_continue_stream(stream_type)` | No-op on FastEdge. Canonical proxy-wasm uses this to resume a paused stream; the FastEdge runtime resumes implicitly by re-invoking the originating lifecycle hook after an HTTP call response. See `PROXY_WASM_LIFECYCLE.md` → Async HTTP Callbacks. `BaseContext.continueRequest()` wraps this call and is therefore ceremonial. |
| `proxy_close_stream(stream_type)` | Abort the pause loop. When called during an async HTTP callback flow, the host exits the pause loop and returns a 503 response. This is the only guest-side mechanism to signal "stop processing" to FastEdge's host-driven resume loop. |
| `proxy_send_local_response(code, details, body, headers, grpc_status)` | Send synthetic response |
| `proxy_clear_route_cache()` | Clear Envoy route cache |

### HTTP Calls (Async)

| Function | Description |
|----------|-------------|
| `proxy_http_call(uri, uri_size, headers, headers_size, body, body_size, trailers, trailers_size, timeout_ms, token_ptr)` | Make async HTTP request, returns token. Resume after the response is handled by the host re-invoking the originating lifecycle hook — see `PROXY_WASM_LIFECYCLE.md` → Async HTTP Callbacks. |

### Shared Data (CAS)

| Function | Description |
|----------|-------------|
| `proxy_get_shared_data(key, key_size, value_ptr, value_size, cas_ptr)` | Read shared data with CAS token |
| `proxy_set_shared_data(key, key_size, value, value_size, cas)` | Write shared data (CAS check) |

### Shared Queues

| Function | Description |
|----------|-------------|
| `proxy_register_shared_queue(name, name_size, token_ptr)` | Create/get queue |
| `proxy_resolve_shared_queue(vm_id, vm_id_size, name, name_size, token_ptr)` | Get remote queue |
| `proxy_dequeue_shared_queue(token, data_ptr, data_size)` | Pop from queue |
| `proxy_enqueue_shared_queue(token, data, data_size)` | Push to queue |

### Metrics

| Function | Description |
|----------|-------------|
| `proxy_define_metric(type, name, name_size, metric_id_ptr)` | Create counter/gauge/histogram |
| `proxy_increment_metric(metric_id, offset)` | Increment counter/gauge |
| `proxy_record_metric(metric_id, value)` | Record histogram value |
| `proxy_get_metric(metric_id, result_ptr)` | Read metric value |

### gRPC

| Function | Description |
|----------|-------------|
| `proxy_grpc_call(...)` | Call gRPC service |
| `proxy_grpc_stream(...)` | Open gRPC stream |
| `proxy_grpc_send(token, msg, msg_size, end_stream)` | Send gRPC message |
| `proxy_grpc_cancel(token)` | Cancel gRPC call |
| `proxy_grpc_close(token)` | Close gRPC stream |

### System

| Function | Description |
|----------|-------------|
| `proxy_set_effective_context(context_id)` | Switch active context |
| `proxy_done()` | Signal processing complete |
| `proxy_call_foreign_function(name, name_size, args, args_size, results, results_size)` | Call native function |

---

## FastEdge-Specific Host Functions

These are Gcore extensions not part of the standard proxy-wasm ABI:

### Dictionary (Large Environment Variables)

| Function | Description |
|----------|-------------|
| `proxy_dictionary_get(key, key_size, value_ptr, value_size_ptr)` | Read env var via host (2 MB limit, use for values > 64 KB) |

### Secrets

| Function | Description |
|----------|-------------|
| `proxy_get_secret(key, key_size, value_ptr, value_size_ptr)` | Read secret by name |
| `proxy_get_effective_at_secret(key, key_size, at, value_ptr, value_size_ptr)` | Read secret from rotation slot |

### KV Store

| Function | Description |
|----------|-------------|
| `proxy_kv_store_open(name, name_size, handle_ptr)` | Open named store, returns handle |
| `proxy_kv_store_get(handle, key, key_size, value_ptr, value_size_ptr)` | Get value by key |
| `proxy_kv_store_scan(handle, pattern, pattern_size, value_ptr, value_size_ptr)` | Scan keys by prefix |
| `proxy_kv_store_zrange_by_score(handle, key, key_size, min, max, value_ptr, value_size_ptr)` | Range query on sorted set |
| `proxy_kv_store_zscan(handle, key, key_size, pattern, pattern_size, value_ptr, value_size_ptr)` | Prefix scan on sorted set |
| `proxy_kv_store_bf_exists(handle, key, key_size, item, item_size, result_ptr)` | Bloom filter membership test |

---

## Result Codes (WasmResultValues)

All proxy ABI calls return `u32` status codes:

| Code | Name | Meaning |
|------|------|---------|
| 0 | Ok | Success |
| 1 | NotFound | Key/resource not found |
| 2 | BadArgument | Invalid parameter |
| 3 | SerializationFailure | Serialization error |
| 4 | ParseFailure | Parse error |
| 5 | BadExpression | Invalid expression |
| 6 | InvalidMemoryAccess | Bad memory pointer |
| 7 | Empty | No data available |
| 8 | CasMismatch | CAS token mismatch (shared data) |
| 9 | ResultMismatch | Unexpected result type |
| 10 | InternalFailure | Host internal error |
| 11 | BrokenConnection | Connection lost |
| 12 | Unimplemented | Function not supported |

---

## Header Serialization Format

Headers are serialized as a binary blob for `proxy_get_header_map_pairs` / `proxy_set_header_map_pairs`:

```
[u32 count]
[u32 key_size_0][u32 value_size_0]...[u32 key_size_n][u32 value_size_n]
[key_0_bytes]\0[value_0_bytes]\0...[key_n_bytes]\0[value_n_bytes]\0
```

## KV Store List Response Format

Multi-value responses (scan, zrange, zscan) use `listParser.ts` wire format:

```
[u32 count][u32 size_0]...[u32 size_n][data_0]...[data_n]
```

---

**Last Updated**: April 2026
