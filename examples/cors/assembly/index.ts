export * from "@gcoredev/proxy-wasm-sdk-as/assembly/proxy";
import {
  Context,
  FilterHeadersStatusValues,
  log,
  LogLevelValues,
  registerRootContext,
  RootContext,
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
    log(
      LogLevelValues.info,
      "Farq: -> CorsContext -> onRequestHeaders -> origin: " + origin,
    );

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

    // OPTIONS preflights are answered by the FastEdge edge layer before this
    // hook fires — don't try to handle them here.

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
