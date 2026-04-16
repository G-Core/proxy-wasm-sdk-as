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
  getEnv,
  setLogLevel,
} from "@gcoredev/proxy-wasm-sdk-as/assembly/fastedge";

class CorsRoot extends RootContext {
  createContext(context_id: u32): Context {
    setLogLevel(LogLevelValues.info);
    return new CorsContext(context_id, this);
  }
}

class CorsContext extends Context {
  constructor(context_id: u32, root_context: CorsRoot) {
    super(context_id, root_context);
  }

  onRequestHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
    const allowedOrigins = getEnv("ALLOWED_ORIGINS");
    const origin = stream_context.headers.request.get("Origin");

    if (origin === "") {
      return FilterHeadersStatusValues.Continue;
    }

    // Check if the origin is allowed
    if (allowedOrigins !== "" && allowedOrigins !== "*") {
      const origins = allowedOrigins.split(",");
      let found = false;
      for (let i = 0; i < origins.length; i++) {
        if (origins[i].trim() == origin) {
          found = true;
          break;
        }
      }
      if (!found) {
        log(LogLevelValues.info, "CORS: origin not allowed: " + origin);
        return FilterHeadersStatusValues.Continue;
      }
    }

    const method = stream_context.headers.request.get(":method");

    // Handle preflight OPTIONS request
    if (method == "OPTIONS") {
      const requestMethod = stream_context.headers.request.get(
        "Access-Control-Request-Method",
      );
      const requestHeaders = stream_context.headers.request.get(
        "Access-Control-Request-Headers",
      );

      const allowMethods =
        getEnv("ALLOWED_METHODS") || "GET, POST, PUT, DELETE, OPTIONS";
      const allowHeaders =
        requestHeaders !== "" ? requestHeaders : "Content-Type, Authorization";
      const maxAge = getEnv("MAX_AGE") || "86400";

      const responseHeaders = new Array<HeaderPair>();
      responseHeaders.push(makeHeaderPair("Access-Control-Allow-Origin", origin));
      responseHeaders.push(makeHeaderPair("Access-Control-Allow-Methods", allowMethods));
      responseHeaders.push(makeHeaderPair("Access-Control-Allow-Headers", allowHeaders));
      responseHeaders.push(makeHeaderPair("Access-Control-Max-Age", maxAge));
      responseHeaders.push(makeHeaderPair("Content-Length", "0"));

      send_http_response(204, "", new ArrayBuffer(0), responseHeaders);

      log(LogLevelValues.info, "CORS: preflight response for " + origin);
      return FilterHeadersStatusValues.StopIteration;
    }

    return FilterHeadersStatusValues.Continue;
  }

  onResponseHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
    const allowedOrigins = getEnv("ALLOWED_ORIGINS");
    const origin = stream_context.headers.request.get("Origin");

    if (origin === "") {
      return FilterHeadersStatusValues.Continue;
    }

    // Verify origin is allowed
    if (allowedOrigins !== "" && allowedOrigins !== "*") {
      const origins = allowedOrigins.split(",");
      let found = false;
      for (let i = 0; i < origins.length; i++) {
        if (origins[i].trim() == origin) {
          found = true;
          break;
        }
      }
      if (!found) {
        return FilterHeadersStatusValues.Continue;
      }
    }

    const effectiveOrigin = allowedOrigins === "*" ? "*" : origin;

    stream_context.headers.response.add(
      "Access-Control-Allow-Origin",
      effectiveOrigin,
    );
    stream_context.headers.response.add("Vary", "Origin");

    const exposeHeaders = getEnv("EXPOSE_HEADERS");
    if (exposeHeaders !== "") {
      stream_context.headers.response.add(
        "Access-Control-Expose-Headers",
        exposeHeaders,
      );
    }

    return FilterHeadersStatusValues.Continue;
  }
}

registerRootContext((context_id: u32) => {
  return new CorsRoot(context_id);
}, "cors");
