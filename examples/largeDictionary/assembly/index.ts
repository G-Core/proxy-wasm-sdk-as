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
  getDictionary,
  setLogLevel,
} from "@gcoredev/proxy-wasm-sdk-as/assembly/fastedge";

class LargeDictionaryRoot extends RootContext {
  createContext(context_id: u32): Context {
    setLogLevel(LogLevelValues.info);
    return new LargeDictionaryContext(context_id, this);
  }
}

class LargeDictionaryContext extends Context {
  constructor(context_id: u32, root_context: LargeDictionaryRoot) {
    super(context_id, root_context);
  }

  onRequestHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
    // Use getDictionary for environment variables that may exceed 64KB.
    // For normal-sized env vars (< 64KB), use getEnv instead.
    const config = getDictionary("LARGE_CONFIG");

    const size = config.length;
    log(LogLevelValues.info, "LARGE_CONFIG size: " + size.toString() + " bytes");

    stream_context.headers.request.add("x-config-size", size.toString());

    return FilterHeadersStatusValues.Continue;
  }
}

registerRootContext((context_id: u32) => {
  return new LargeDictionaryRoot(context_id);
}, "largeDictionary");
