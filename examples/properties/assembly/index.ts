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
  set_property,
  stream_context,
} from "@gcoredev/proxy-wasm-sdk-as/assembly";

const REQUEST_URI = "request.url";
const REQUEST_HOST = "request.host";
const REQUEST_PATH = "request.path";
const REQUEST_SCHEME = "request.scheme";
const REQUEST_EXTENSION = "request.extension";
const REQUEST_QUERY = "request.query";
const REQUEST_X_REAL_IP = "request.x_real_ip";
const REQUEST_COUNTRY = "request.country";
const REQUEST_CITY = "request.city";

class PropertiesRoot extends RootContext {
  createContext(context_id: u32): Context {
    return new Properties(context_id, this);
  }
}

class Properties extends Context {
  constructor(context_id: u32, root_context: PropertiesRoot) {
    super(context_id, root_context);
  }

  onRequestHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
    if (!this.handleProperty(REQUEST_URI, 551, "uri", "request-uri")) {
      return FilterHeadersStatusValues.StopIteration;
    }

    if (!this.handleProperty(REQUEST_HOST, 552)) {
      return FilterHeadersStatusValues.StopIteration;
    }

    if (!this.handleProperty(REQUEST_PATH, 553, "path", "request-path")) {
      return FilterHeadersStatusValues.StopIteration;
    }

    if (!this.handleProperty(REQUEST_SCHEME, 554, "scheme", "request-scheme")) {
      return FilterHeadersStatusValues.StopIteration;
    }

    if (!this.handleProperty(REQUEST_EXTENSION, 555, "extension", "request-extension", true)) {
      return FilterHeadersStatusValues.StopIteration;
    }

    if (!this.handleProperty(REQUEST_QUERY, 556, "query", "request-query", true)) {
      return FilterHeadersStatusValues.StopIteration;
    }

    if (!this.handleProperty(REQUEST_X_REAL_IP, 557, "client_ip", "request-x-real-ip")) {
      return FilterHeadersStatusValues.StopIteration;
    }

    if (!this.handleProperty(REQUEST_COUNTRY, 558, "country", "request-country")) {
      return FilterHeadersStatusValues.StopIteration;
    }

    if (!this.handleProperty(REQUEST_CITY, 559, "city", "request-city")) {
      return FilterHeadersStatusValues.StopIteration;
    }

    // Handle query parameters
    const query = get_property(REQUEST_QUERY);
    if (query.byteLength !== 0) {
      const queryString = String.UTF8.decode(query);
      log(LogLevelValues.info, "query=" + queryString);
      const params = queryString
        .split("&")
        .map<Array<string>>((pair) => pair.split("="));

      for (let i = 0; i < params.length; i++) {
        const param = params[i];
        if (param.length !== 2) {
          continue; // Skip invalid query parameters
        }
        const key = param[0];
        const value = param[1];
        if (key.toLowerCase() === "url") {
          log(LogLevelValues.info, `change url to: ${value}`);
          set_property(REQUEST_URI, String.UTF8.encode(value));
        } else if (key.toLowerCase() === "host") {
          log(LogLevelValues.info, `change host to: ${value}`);
          set_property(REQUEST_HOST, String.UTF8.encode(value));
        } else if (key.toLowerCase() === "path") {
          log(LogLevelValues.info, `change path to: ${value}`);
          set_property(REQUEST_PATH, String.UTF8.encode(value));
        }
      }
    }

    return FilterHeadersStatusValues.Continue;
  }

  // allowEmpty=true for properties that may legitimately be absent (e.g. request.extension
  // when the path has no file extension, request.query when there is no query string).
  // In that case the property is logged with an empty value and processing continues
  // without adding an empty response header.
  private handleProperty(
    propertyKey: string,
    errorCode: u32,
    propertyName: string = "",
    headerName: string = "",
    allowEmpty: boolean = false
  ): boolean {
    const valueArr = get_property(propertyKey);
    if (valueArr.byteLength === 0) {
      if (allowEmpty) {
        if (propertyName.length > 0) {
          log(LogLevelValues.info, "onRequestHeaders >> " + propertyName + ": ");
        }
        return true;
      }
      send_http_response(
        errorCode,
        "internal server error",
        String.UTF8.encode("Internal server error"),
        []
      );
      return false;
    }
    const value = String.UTF8.decode(valueArr);
    if (propertyName.length > 0) {
      log(LogLevelValues.info, "onRequestHeaders >> " + propertyName + ": " + value);
    }
    if (headerName.length > 0) {
      stream_context.headers.response.add(headerName, value);
    }
    return true;
  }
}

registerRootContext((context_id: u32) => {
  return new PropertiesRoot(context_id);
}, "properties");
