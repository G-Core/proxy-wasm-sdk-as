export * from "@gcoredev/proxy-wasm-sdk-as/assembly/proxy"; // this exports the required functions for the proxy to interact with us.
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
  getSecret,
  setLogLevel,
} from "@gcoredev/proxy-wasm-sdk-as/assembly/fastedge";

class VariablesRoot extends RootContext {
  createContext(context_id: u32): Context {
    setLogLevel(LogLevelValues.debug);
    return new VariablesContext(context_id, this);
  }
}

class VariablesContext extends Context {
  constructor(context_id: u32, root_context: VariablesRoot) {
    super(context_id, root_context);
  }

  onRequestHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
    const username = getEnv("USERNAME");
    const password = getSecret("PASSWORD");

    log(LogLevelValues.info, "USERNAME: " + username);
    log(LogLevelValues.info, "PASSWORD: " + password);

    stream_context.headers.request.add("x-env-username", username);
    stream_context.headers.request.add("x-env-password", password);

    return FilterHeadersStatusValues.Continue;
  }
}

registerRootContext((context_id: u32) => {
  return new VariablesRoot(context_id);
}, "variablesAndSecrets");
