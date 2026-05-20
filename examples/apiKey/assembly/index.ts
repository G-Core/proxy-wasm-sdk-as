export * from "@gcoredev/proxy-wasm-sdk-as/assembly/proxy";
import {
  Context,
  FilterHeadersStatusValues,
  HeaderPair,
  log,
  LogLevelValues,
  makeHeaderPair,
  registerRootContext,
  RootContext,
  send_http_response,
  stream_context,
} from "@gcoredev/proxy-wasm-sdk-as/assembly";
import {
  getSecret,
  setLogLevel,
} from "@gcoredev/proxy-wasm-sdk-as/assembly/fastedge";

const UNAUTHORIZED: u32 = 401;
const FORBIDDEN: u32 = 403;
const INTERNAL_SERVER_ERROR: u32 = 500;

class ApiKeyRoot extends RootContext {
  createContext(context_id: u32): Context {
    setLogLevel(LogLevelValues.info);
    return new ApiKeyContext(context_id, this);
  }
}

class ApiKeyContext extends Context {
  constructor(context_id: u32, root_context: ApiKeyRoot) {
    super(context_id, root_context);
  }

  onRequestHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
    const expectedKey = getSecret("API_KEY");
    if (expectedKey === "") {
      log(LogLevelValues.error, "API_KEY secret not configured");
      send_http_response(
        INTERNAL_SERVER_ERROR,
        "internal server error",
        String.UTF8.encode("App misconfigured"),
        [],
      );
      return FilterHeadersStatusValues.StopIteration;
    }

    const providedKey = stream_context.headers.request.get("X-API-Key");

    if (providedKey === "") {
      const authHeaders = new Array<HeaderPair>();
      authHeaders.push(makeHeaderPair("WWW-Authenticate", "API-Key"));
      send_http_response(
        UNAUTHORIZED,
        "unauthorized",
        String.UTF8.encode("Missing X-API-Key header"),
        authHeaders,
      );
      return FilterHeadersStatusValues.StopIteration;
    }

    if (providedKey !== expectedKey) {
      log(LogLevelValues.info, "API key validation failed");
      send_http_response(
        FORBIDDEN,
        "forbidden",
        String.UTF8.encode("Invalid API key"),
        [],
      );
      return FilterHeadersStatusValues.StopIteration;
    }

    // .remove() sets the header value to "" rather than deleting it entirely —
    // the upstream will see X-API-Key: "" rather than a missing header.
    stream_context.headers.request.remove("X-API-Key");

    log(LogLevelValues.info, "API key validated successfully");
    return FilterHeadersStatusValues.Continue;
  }
}

registerRootContext((context_id: u32) => {
  return new ApiKeyRoot(context_id);
}, "apiKey");
