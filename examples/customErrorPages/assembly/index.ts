export * from "@gcoredev/proxy-wasm-sdk-as/assembly/proxy";
import {
  Context,
  FilterDataStatusValues,
  FilterHeadersStatusValues,
  get_property,
  log,
  LogLevelValues,
  registerRootContext,
  RootContext,
  set_buffer_bytes,
  BufferTypeValues,
  stream_context,
} from "@gcoredev/proxy-wasm-sdk-as/assembly";
import { setLogLevel } from "@gcoredev/proxy-wasm-sdk-as/assembly/fastedge";

class ErrorPagesRoot extends RootContext {
  createContext(context_id: u32): Context {
    setLogLevel(LogLevelValues.info);
    return new ErrorPagesContext(context_id, this);
  }
}

class ErrorPagesContext extends Context {
  constructor(context_id: u32, root_context: ErrorPagesRoot) {
    super(context_id, root_context);
  }

  onResponseHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
    const statusBuf = get_property("response.status");
    if (statusBuf.byteLength < 2) {
      return FilterHeadersStatusValues.Continue;
    }

    const bytes = Uint8Array.wrap(statusBuf);
    const code: u32 = (u32(bytes[0]) << 8) | u32(bytes[1]);

    if (code >= 400 && code < 600) {
      stream_context.headers.response.replace("Content-Type", "text/html");
      stream_context.headers.response.remove("Content-Length");
      stream_context.headers.response.replace("Transfer-Encoding", "Chunked");

      log(LogLevelValues.info, "Error response detected: " + code.toString());
    }

    return FilterHeadersStatusValues.Continue;
  }

  onResponseBody(
    body_buffer_length: usize,
    end_of_stream: bool,
  ): FilterDataStatusValues {
    // Read response status from property (no instance state between hooks)
    const statusBuf = get_property("response.status");
    if (statusBuf.byteLength < 2) {
      return FilterDataStatusValues.Continue;
    }

    const bytes = Uint8Array.wrap(statusBuf);
    const code: u32 = (u32(bytes[0]) << 8) | u32(bytes[1]);

    if (code < 400 || code >= 600) {
      return FilterDataStatusValues.Continue;
    }

    if (!end_of_stream) {
      return FilterDataStatusValues.StopIterationAndBuffer;
    }
    const title = this.getErrorTitle(code);
    const description = this.getErrorDescription(code);
    const category = code >= 500 ? "Server Error" : "Client Error";

    const html =
      '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      "<title>" +
      code.toString() +
      " — " +
      title +
      "</title>" +
      "<style>" +
      "body{margin:0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;" +
      "display:flex;align-items:center;justify-content:center;min-height:100vh;" +
      "background:#f8f9fa;color:#333}" +
      ".container{text-align:center;padding:2rem;max-width:480px}" +
      ".code{font-size:6rem;font-weight:700;color:#dee2e6;margin:0;line-height:1}" +
      ".title{font-size:1.5rem;font-weight:600;margin:1rem 0 .5rem}" +
      ".desc{color:#6c757d;line-height:1.6}" +
      ".category{font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:#adb5bd;margin-top:2rem}" +
      "</style></head><body><div class='container'>" +
      "<p class='code'>" +
      code.toString() +
      "</p>" +
      "<h1 class='title'>" +
      title +
      "</h1>" +
      "<p class='desc'>" +
      description +
      "</p>" +
      "<p class='category'>" +
      category +
      "</p>" +
      "</div></body></html>";

    const body = String.UTF8.encode(html);
    set_buffer_bytes(BufferTypeValues.HttpResponseBody, 0, body.byteLength, body);

    return FilterDataStatusValues.Continue;
  }

  private getErrorTitle(code: u32): string {
    if (code == 400) return "Bad Request";
    if (code == 401) return "Unauthorized";
    if (code == 403) return "Forbidden";
    if (code == 404) return "Not Found";
    if (code == 405) return "Method Not Allowed";
    if (code == 408) return "Request Timeout";
    if (code == 429) return "Too Many Requests";
    if (code == 500) return "Internal Server Error";
    if (code == 502) return "Bad Gateway";
    if (code == 503) return "Service Unavailable";
    if (code == 504) return "Gateway Timeout";
    if (code >= 500) return "Server Error";
    return "Error";
  }

  private getErrorDescription(code: u32): string {
    if (code == 400)
      return "The server could not understand the request due to invalid syntax.";
    if (code == 401)
      return "You need to authenticate to access this resource.";
    if (code == 403)
      return "You do not have permission to access this resource.";
    if (code == 404)
      return "The requested page could not be found. It may have been moved or deleted.";
    if (code == 405)
      return "The request method is not supported for this resource.";
    if (code == 408)
      return "The server timed out waiting for the request.";
    if (code == 429)
      return "You have sent too many requests. Please try again later.";
    if (code == 500)
      return "The server encountered an unexpected condition that prevented it from fulfilling the request.";
    if (code == 502)
      return "The server received an invalid response from the upstream server.";
    if (code == 503)
      return "The server is temporarily unavailable. Please try again later.";
    if (code == 504)
      return "The server did not receive a timely response from the upstream server.";
    if (code >= 500)
      return "The server encountered an error processing your request.";
    return "An error occurred processing your request.";
  }
}

registerRootContext((context_id: u32) => {
  return new ErrorPagesRoot(context_id);
}, "customErrorPages");
