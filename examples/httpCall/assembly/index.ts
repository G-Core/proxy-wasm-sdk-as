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

class HttpCallRoot extends RootContext {
  createContext(context_id: u32): Context {
    setLogLevel(LogLevelValues.info);
    return new HttpCallContext(context_id, this);
  }

  onHttpCallResponse(
    token: u32,
    headers: u32,
    body_size: u32,
    trailers: u32,
  ): void {
    log(
      LogLevelValues.info,
      "Received http call response with token id: " + token.toString(),
    );

    // If headers is 0, the HTTP call failed (timeout, DNS failure, etc.)
    if (headers == 0) {
      log(LogLevelValues.error, "HTTP call failed — no response received");
      return;
    }

    const userAgent = stream_context.headers.http_callback.get("user-agent");
    if (userAgent !== "") {
      log(LogLevelValues.info, "User-Agent: " + userAgent);
    }

    if (body_size > 0) {
      const bodyBytes = get_buffer_bytes(
        BufferTypeValues.HttpCallResponseBody,
        0,
        body_size,
      );
      const bodyStr = String.UTF8.decode(bodyBytes);
      log(LogLevelValues.info, "Response body (" + body_size.toString() + " bytes): " + bodyStr);
    } else {
      log(LogLevelValues.info, "Response body: empty");
    }
  }
}

class HttpCallContext extends Context {
  constructor(context_id: u32, root_context: HttpCallRoot) {
    super(context_id, root_context);
  }

  onRequestHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
    log(LogLevelValues.info, "onRequestHeaders >> dispatching HTTP call");

    const authority = stream_context.headers.request.get(":authority");
    const scheme = stream_context.headers.request.get(":scheme");

    const headers = new Array<HeaderPair>();
    headers.push(makeHeaderPair(":authority", authority));
    headers.push(makeHeaderPair(":scheme", scheme !== "" ? scheme : "https"));
    headers.push(makeHeaderPair(":path", "/ip"));
    headers.push(makeHeaderPair(":method", "GET"));
    headers.push(makeHeaderPair("User-Agent", "fastedge"));

    const result = (this.root_context as HttpCallRoot).httpCall(
      authority,
      headers,
      new ArrayBuffer(0),
      new Array<HeaderPair>(),
      1000,
      this,
      (
        ctx: BaseContext,
        hdrs: u32,
        bodySize: usize,
        trls: u32,
      ): void => {},
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

    log(LogLevelValues.info, "HTTP call dispatched, pausing request");

    // Pause the request until the HTTP call response arrives
    return FilterHeadersStatusValues.StopIteration;
  }
}

registerRootContext((context_id: u32) => {
  return new HttpCallRoot(context_id);
}, "httpCall");
