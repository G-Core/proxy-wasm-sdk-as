export * from "@gcoredev/proxy-wasm-sdk-as/assembly/proxy"; // this exports the required functions for the proxy to interact with us.
import {
  Context,
  FilterDataStatusValues,
  FilterHeadersStatusValues,
  log,
  LogLevelValues,
  registerRootContext,
  RootContext,
} from "@gcoredev/proxy-wasm-sdk-as/assembly";

class HelloWorldRoot extends RootContext {
  createContext(context_id: u32): Context {
    return new HelloWorld(context_id, this);
  }
}

class HelloWorld extends Context {
  constructor(context_id: u32, root_context: HelloWorldRoot) {
    super(context_id, root_context);
  }

  onRequestHeaders(
    headers: u32,
    end_of_stream: bool
  ): FilterHeadersStatusValues {
    log(LogLevelValues.info, "onRequestHeaders >>");
    return FilterHeadersStatusValues.Continue;
  }

  onRequestBody(
    body_buffer_length: usize,
    end_of_stream: bool
  ): FilterDataStatusValues {
    log(LogLevelValues.info, "onRequestBody >>");
    return FilterDataStatusValues.Continue;
  }

  onResponseHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
    log(LogLevelValues.info, "onResponseHeaders >>");
    return FilterHeadersStatusValues.Continue;
  }

  onResponseBody(
    body_buffer_length: usize,
    end_of_stream: bool
  ): FilterDataStatusValues {
    log(LogLevelValues.info, "onResponseBody >>");
    return FilterDataStatusValues.Continue;
  }
}

registerRootContext((context_id: u32) => {
  return new HelloWorldRoot(context_id);
}, "helloWorld");
