export * from "@gcoredev/proxy-wasm-sdk-as/assembly/proxy"; // this exports the required functions for the proxy to interact with us.
import {
  Context,
  FilterHeadersStatusValues,
  log,
  LogLevelValues,
  registerRootContext,
  RootContext,
} from "@gcoredev/proxy-wasm-sdk-as/assembly";
import { getCurrentTime } from "@gcoredev/proxy-wasm-sdk-as/assembly/fastedge";

function getCurrentDateString(): string {
  const date = new Date(getCurrentTime());
  return date.toISOString();
}

class LogTimeRoot extends RootContext {
  createContext(context_id: u32): Context {
    return new LogTime(context_id, this);
  }
}

class LogTime extends Context {
  constructor(context_id: u32, root_context: LogTimeRoot) {
    super(context_id, root_context);
  }

  onRequestHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
    log(
      LogLevelValues.info,
      "onRequestHeaders >> currentTime: " + getCurrentDateString()
    );
    return FilterHeadersStatusValues.Continue;
  }

  onResponseHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
    log(
      LogLevelValues.info,
      "onResponseHeaders >> currentTime: " + getCurrentDateString()
    );
    return FilterHeadersStatusValues.Continue;
  }
}

registerRootContext((context_id: u32) => {
  return new LogTimeRoot(context_id);
}, "logtime");
