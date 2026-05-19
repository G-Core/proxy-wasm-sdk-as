export * from "@gcoredev/proxy-wasm-sdk-as/assembly/proxy"; // this exports the required functions for the proxy to interact with us.
import {
  BaseContext,
  BufferTypeValues,
  Context,
  FilterHeadersStatusValues,
  get_buffer_bytes,
  HeaderPair,
  log,
  LogLevelValues,
  makeHeaderPair,
  registerRootContext,
  RootContext,
  send_http_response,
  stream_context,
  WasmResultValues,
} from "@gcoredev/proxy-wasm-sdk-as/assembly";
import { setLogLevel } from "@gcoredev/proxy-wasm-sdk-as/assembly/fastedge";

const INTERNAL_SERVER_ERROR: u32 = 500;

function handleHttpCallResponse(
  ctx: BaseContext,
  hdrs: u32,
  bodySize: usize,
  trls: u32,
): void {
  if (hdrs == 0) {
    log(LogLevelValues.error, "HTTP call failed — no response received");
    return;
  }

  const userAgent = stream_context.headers.http_callback.get("user-agent");
  if (userAgent !== "") {
    log(LogLevelValues.info, "User-Agent: " + userAgent);
  }

  if (bodySize > 0) {
    const bodyBytes = get_buffer_bytes(
      BufferTypeValues.HttpCallResponseBody,
      0,
      bodySize as u32,
    );
    const bodyStr = String.UTF8.decode(bodyBytes);
    log(
      LogLevelValues.info,
      "Response body (" + bodySize.toString() + " bytes): " + bodyStr,
    );
  } else {
    log(LogLevelValues.info, "Response body: empty");
  }
}

class HttpCallRoot extends RootContext {
  createContext(context_id: u32): Context {
    setLogLevel(LogLevelValues.info);
    return new HttpCallContext(context_id, this);
  }
}

class HttpCallContext extends Context {
  httpCallDispatched: bool = false;

  constructor(context_id: u32, root_context: HttpCallRoot) {
    super(context_id, root_context);
  }

  onRequestHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
    // FastEdge re-invokes this hook after the httpCall response is processed.
    // The latch gates re-dispatch so the second invocation returns Continue
    // instead of firing another HTTP call. See SDK docs → Outbound HTTP.
    if (this.httpCallDispatched) {
      log(
        LogLevelValues.info,
        "HTTP call response received, resuming request.",
      );
      return FilterHeadersStatusValues.Continue;
    }

    log(LogLevelValues.info, "onRequestHeaders >> dispatching HTTP call");

    const headers = new Array<HeaderPair>();
    headers.push(makeHeaderPair(":scheme", "https"));
    headers.push(makeHeaderPair(":authority", "httpbin.org"));
    headers.push(makeHeaderPair(":path", "/ip"));
    headers.push(makeHeaderPair(":method", "GET"));
    headers.push(makeHeaderPair("User-Agent", "fastedge"));

    // 3000ms accommodates cold DNS + variable network conditions; tune per upstream in production.
    const result = (this.root_context as HttpCallRoot).httpCall(
      "httpbin.org",
      headers,
      new ArrayBuffer(0),
      new Array<HeaderPair>(),
      3000,
      this,
      handleHttpCallResponse,
    );

    if (result != WasmResultValues.Ok) {
      log(
        LogLevelValues.error,
        "Failed to dispatch HTTP call: " + result.toString(),
      );
      send_http_response(
        INTERNAL_SERVER_ERROR,
        "internal server error",
        String.UTF8.encode("Failed to dispatch HTTP call"),
        [],
      );
      return FilterHeadersStatusValues.StopIteration;
    }

    this.httpCallDispatched = true;
    log(LogLevelValues.info, "HTTP call dispatched, pausing request");

    return FilterHeadersStatusValues.StopIteration;
  }
}

registerRootContext((context_id: u32) => {
  return new HttpCallRoot(context_id);
}, "httpCall");
