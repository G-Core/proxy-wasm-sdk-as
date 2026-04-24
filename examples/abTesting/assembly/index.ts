export * from "@gcoredev/proxy-wasm-sdk-as/assembly/proxy";
import {
  Context,
  FilterHeadersStatusValues,
  get_property,
  log,
  LogLevelValues,
  registerRootContext,
  RootContext,
  send_http_response,
  set_property,
  stream_context,
} from "@gcoredev/proxy-wasm-sdk-as/assembly";
import {
  getEnv,
  setLogLevel,
} from "@gcoredev/proxy-wasm-sdk-as/assembly/fastedge";
import { getCurrentTime } from "@gcoredev/proxy-wasm-sdk-as/assembly/fastedge/utils/runtime";

class AbTestingRoot extends RootContext {
  createContext(context_id: u32): Context {
    setLogLevel(LogLevelValues.info);
    return new AbTestingContext(context_id, this);
  }
}

class AbTestingContext extends Context {
  constructor(context_id: u32, root_context: AbTestingRoot) {
    super(context_id, root_context);
  }

  onRequestHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
    const experimentName = getEnv("EXPERIMENT_NAME");
    if (experimentName === "") {
      send_http_response(
        500,
        "internal server error",
        String.UTF8.encode("App misconfigured - EXPERIMENT_NAME must be set"),
        [],
      );
      return FilterHeadersStatusValues.StopIteration;
    }

    const variantAPath = getEnv("VARIANT_A_PATH");
    const variantBPath = getEnv("VARIANT_B_PATH");
    if (variantAPath === "" || variantBPath === "") {
      send_http_response(
        500,
        "internal server error",
        String.UTF8.encode(
          "App misconfigured - VARIANT_A_PATH and VARIANT_B_PATH must be set",
        ),
        [],
      );
      return FilterHeadersStatusValues.StopIteration;
    }

    // Check for existing experiment cookie
    const cookieName = "fe_exp_" + experimentName;
    const cookieHeader = stream_context.headers.request.get("Cookie");
    let assignedVariant = this.getCookieValue(cookieHeader, cookieName);

    // Assign variant if not already set
    if (assignedVariant !== "A" && assignedVariant !== "B") {
      // Use current time as a simple entropy source for 50/50 split
      const now = getCurrentTime();
      assignedVariant = now % 2 == 0 ? "A" : "B";
    }

    // Rewrite the request path to the variant path
    const pathArrBuf = get_property("request.path");
    if (pathArrBuf.byteLength === 0) {
      return FilterHeadersStatusValues.Continue;
    }
    const originalPath = String.UTF8.decode(pathArrBuf);
    const variantPath = assignedVariant === "A" ? variantAPath : variantBPath;
    const newPath = variantPath + originalPath;

    // Reconstruct request.url from its decomposed parts rather than splicing
    // the path out of the full URL — splicing breaks when the path happens to
    // appear inside the host, and it can silently lose the query string.
    const schemeBuf = get_property("request.scheme");
    const hostBuf = get_property("request.host");
    if (schemeBuf.byteLength > 0 && hostBuf.byteLength > 0) {
      const scheme = String.UTF8.decode(schemeBuf);
      const host = String.UTF8.decode(hostBuf);
      const queryBuf = get_property("request.query");
      const query = queryBuf.byteLength > 0 ? String.UTF8.decode(queryBuf) : "";
      const newUrl =
        scheme + "://" + host + newPath + (query.length > 0 ? "?" + query : "");
      log(
        LogLevelValues.info,
        `Farq: -> AbTestingContext -> onRequestHeaders -> newUrl: ${newUrl}`,
      );
      set_property("request.url", String.UTF8.encode(newUrl));
    }

    // Add variant header for upstream visibility
    stream_context.headers.request.add("X-Experiment", experimentName);
    stream_context.headers.request.add("X-Variant", assignedVariant);

    log(
      LogLevelValues.info,
      `A/B test "${experimentName}": variant ${assignedVariant}, path ${newPath}`,
    );

    return FilterHeadersStatusValues.Continue;
  }

  onResponseHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
    // Recover the assigned variant from the request header set in onRequestHeaders.
    // Instance state (this.variant) does not survive the nginx -> core-proxy hop.
    const variant = stream_context.headers.request.get("X-Variant");
    if (variant === "") {
      return FilterHeadersStatusValues.Continue;
    }

    const experimentName = getEnv("EXPERIMENT_NAME");
    const cookieName = "fe_exp_" + experimentName;

    // Set the experiment cookie so subsequent requests stick to the same variant
    stream_context.headers.response.add(
      "Set-Cookie",
      cookieName + "=" + variant + "; Path=/; Max-Age=86400; SameSite=Lax",
    );

    // Add variant as response header for observability
    stream_context.headers.response.add("X-Variant", variant);

    return FilterHeadersStatusValues.Continue;
  }

  private getCookieValue(cookieHeader: string, name: string): string {
    if (cookieHeader === "") return "";
    const pairs = cookieHeader.split(";");
    const prefix = name + "=";
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i].trim();
      if (pair.startsWith(prefix)) {
        return pair.substring(prefix.length);
      }
    }
    return "";
  }
}

registerRootContext((context_id: u32) => {
  return new AbTestingRoot(context_id);
}, "abTesting");
