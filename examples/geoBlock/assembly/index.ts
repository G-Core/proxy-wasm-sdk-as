export * from "@gcoredev/proxy-wasm-sdk-as/assembly/proxy"; // this exports the required functions for the proxy to interact with us.
import {
  Context,
  FilterHeadersStatusValues,
  get_property,
  log,
  LogLevelValues,
  registerRootContext,
  RootContext,
  send_http_response,
} from "@gcoredev/proxy-wasm-sdk-as/assembly";
import {
  getEnv,
  setLogLevel,
} from "@gcoredev/proxy-wasm-sdk-as/assembly/fastedge";

const BAD_GATEWAY: u32 = 502;
const FORBIDDEN: u32 = 403;
const INTERNAL_SERVER_ERROR: u32 = 500;

class GeoBlockRoot extends RootContext {
  createContext(context_id: u32): Context {
    setLogLevel(LogLevelValues.info);
    return new GeoBlock(context_id, this);
  }
}

class GeoBlock extends Context {
  constructor(context_id: u32, root_context: GeoBlockRoot) {
    super(context_id, root_context);
  }

  onRequestHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
    const blacklist = getEnv("BLACKLIST");
    if (!blacklist) {
      send_http_response(
        INTERNAL_SERVER_ERROR,
        "internal server error",
        String.UTF8.encode("App misconfigured"),
        [],
      );
      return FilterHeadersStatusValues.StopIteration;
    }

    const blacklistedCountries = blacklist
      .split(",")
      .map<string>((c) => c.trim());

    if (blacklistedCountries.length === 0) {
      send_http_response(
        INTERNAL_SERVER_ERROR,
        "internal server error",
        String.UTF8.encode("App misconfigured"),
        [],
      );
      return FilterHeadersStatusValues.StopIteration;
    }

    const country = get_property("request.country");
    if (country.byteLength === 0) {
      send_http_response(
        BAD_GATEWAY,
        "internal server error",
        String.UTF8.encode("Missing country information"),
        [],
      );
      return FilterHeadersStatusValues.StopIteration;
    }

    const countryStr = String.UTF8.decode(country);
    if (blacklistedCountries.includes(countryStr)) {
      log(LogLevelValues.info, "geoBlock: blocked request from " + countryStr);
      send_http_response(
        FORBIDDEN,
        "forbidden",
        String.UTF8.encode("Request blacklisted"),
        [],
      );
      return FilterHeadersStatusValues.StopIteration;
    }

    log(LogLevelValues.info, "geoBlock: allowed request from " + countryStr);
    return FilterHeadersStatusValues.Continue;
  }
}

registerRootContext((context_id: u32) => {
  return new GeoBlockRoot(context_id);
}, "geoBlock");
