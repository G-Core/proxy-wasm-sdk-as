export * from "@gcoredev/proxy-wasm-sdk-as/assembly/proxy";
import {
  Context,
  FilterHeadersStatusValues,
  get_property,
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

class CacheControlRoot extends RootContext {
  createContext(context_id: u32): Context {
    setLogLevel(LogLevelValues.info);
    return new CacheControlContext(context_id, this);
  }
}

class CacheControlContext extends Context {
  constructor(context_id: u32, root_context: CacheControlRoot) {
    super(context_id, root_context);
  }

  onResponseHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
    const statusBuf = get_property("response.status");
    let statusCode: u32 = 200;
    if (statusBuf.byteLength >= 2) {
      const bytes = Uint8Array.wrap(statusBuf);
      statusCode = (u32(bytes[0]) << 8) | u32(bytes[1]);
    }

    // Only cache successful responses
    if (statusCode < 200 || statusCode >= 400) {
      stream_context.headers.response.replace(
        "Cache-Control",
        "no-store",
      );
      return FilterHeadersStatusValues.Continue;
    }

    // Determine cache policy based on content type
    const contentType = stream_context.headers.response.get("Content-Type");

    const rawStaticMaxAge = getEnv("STATIC_MAX_AGE");
    const staticMaxAge = rawStaticMaxAge === "" ? "31536000" : rawStaticMaxAge;
    const rawHtmlMaxAge = getEnv("HTML_MAX_AGE");
    const htmlMaxAge = rawHtmlMaxAge === "" ? "3600" : rawHtmlMaxAge;
    const rawApiMaxAge = getEnv("API_MAX_AGE");
    const apiMaxAge = rawApiMaxAge === "" ? "0" : rawApiMaxAge;

    let cacheControl: string;

    if (this.isStaticAsset(contentType)) {
      // Static assets: long cache, immutable
      cacheControl = "public, max-age=" + staticMaxAge + ", immutable";
    } else if (contentType.includes("text/html")) {
      // HTML: short cache, must revalidate
      cacheControl = "public, max-age=" + htmlMaxAge + ", must-revalidate";
      stream_context.headers.response.add("Vary", "Accept-Encoding");
    } else if (
      contentType.includes("application/json") ||
      contentType.includes("application/xml")
    ) {
      // API responses: configurable, private by default
      if (apiMaxAge === "0") {
        cacheControl = "no-cache, no-store, must-revalidate";
      } else {
        cacheControl = "private, max-age=" + apiMaxAge + ", must-revalidate";
      }
      stream_context.headers.response.add("Vary", "Accept, Authorization");
    } else {
      // Default: moderate cache
      cacheControl = "public, max-age=600";
    }

    stream_context.headers.response.replace("Cache-Control", cacheControl);

    log(
      LogLevelValues.info,
      "Cache-Control: " + cacheControl + " (content-type: " + contentType + ")",
    );

    return FilterHeadersStatusValues.Continue;
  }

  private isStaticAsset(contentType: string): bool {
    return (
      contentType.includes("image/") ||
      contentType.includes("font/") ||
      contentType.includes("application/javascript") ||
      contentType.includes("text/css") ||
      contentType.includes("text/javascript") ||
      contentType.includes("application/wasm")
    );
  }
}

registerRootContext((context_id: u32) => {
  return new CacheControlRoot(context_id);
}, "cacheControl");
