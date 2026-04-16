# Getting Started with the AssemblyScript Proxy-Wasm SDK

Build CDN filter applications that compile to WebAssembly and run on the FastEdge platform.

## Prerequisites

- Node.js 18 or later
- npm or pnpm

## Create a New Project

Create a directory for your CDN app and initialise a package:

```bash
mkdir my-cdn-app
cd my-cdn-app
npm init -y
```

### Install Dependencies

Install the SDK and AssemblyScript toolchain:

```bash
npm install @gcoredev/proxy-wasm-sdk-as@1.2.0
npm install --save-dev assemblyscript@^0.28.9 @assemblyscript/wasi-shim@^0.1.0
```

Add build scripts to your `package.json`:

```json
{
  "scripts": {
    "asbuild:debug": "asc assembly/index.ts --target debug",
    "asbuild:release": "asc assembly/index.ts --target release",
    "asbuild": "npm run asbuild:debug && npm run asbuild:release"
  }
}
```

### Project Structure

```
my-cdn-app/
├── assembly/
│   └── index.ts        # Your CDN app entry point
├── asconfig.json       # AssemblyScript build configuration
└── package.json
```

## Write Your First CDN App

Create `assembly/index.ts`. Every CDN app must re-export the proxy entry points and register a root context:

```typescript
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
```

### What each part does

| Part                                 | Purpose                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `export * from ".../assembly/proxy"` | Exposes the wasm entry points the host runtime calls into. Required in every app.                           |
| `RootContext` subclass               | Created once per worker; `createContext` produces a `Context` for each hook invocation.                     |
| `Context` subclass                   | Handles a single lifecycle hook. A fresh instance is created for each hook phase,                           |
|                                      | instance fields do not persist across hooks. See [Hook State Isolation](./SDK_API.md#hook-state-isolation). |
| `registerRootContext`                | Registers your root context factory with the proxy runtime.                                                 |

### Lifecycle hooks

Override any of these methods on your `Context` subclass to intercept traffic:

| Method                                                                                   | Called when                          |
| ---------------------------------------------------------------------------------------- | ------------------------------------ |
| `onRequestHeaders(headers: u32, end_of_stream: bool): FilterHeadersStatusValues`         | Inbound request headers arrive       |
| `onRequestBody(body_buffer_length: usize, end_of_stream: bool): FilterDataStatusValues`  | Inbound request body chunk arrives   |
| `onResponseHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues`              | Outbound response headers arrive     |
| `onResponseBody(body_buffer_length: usize, end_of_stream: bool): FilterDataStatusValues` | Outbound response body chunk arrives |

Return `FilterHeadersStatusValues.Continue` or `FilterDataStatusValues.Continue` to pass the data through unmodified.

### Logging

Use `log` from the SDK. `console.log` is not available in the WebAssembly environment.

```typescript
import { log, LogLevelValues } from "@gcoredev/proxy-wasm-sdk-as/assembly";

log(LogLevelValues.info, "request received");
log(LogLevelValues.warn, "unexpected header value");
log(LogLevelValues.error, "aborting request");
log(LogLevelValues.debug, "header count: " + headers.toString());
```

Log output is routed through the proxy-wasm host to stdout.

### Error handling

AssemblyScript does not support `try/catch` in most contexts. Check return values instead. `getEnv` returns an empty string when the variable is not set:

```typescript
import {
  FilterHeadersStatusValues,
  log,
  LogLevelValues,
} from "@gcoredev/proxy-wasm-sdk-as/assembly";
import { getEnv } from "@gcoredev/proxy-wasm-sdk-as/assembly/fastedge";

// inside a Context hook, e.g. onRequestHeaders
const value = getEnv("MY_VAR");
if (!value) {
  log(LogLevelValues.warn, "MY_VAR not set");
  return FilterHeadersStatusValues.Continue;
}
```

## Build Configuration (asconfig.json)

Create `asconfig.json` in your project root:

```json
{
  "extends": "./node_modules/@assemblyscript/wasi-shim/asconfig.json",
  "targets": {
    "debug": {
      "outFile": "build/my-cdn-app-debug.wasm",
      "textFile": "build/my-cdn-app-debug.wat",
      "sourceMap": true,
      "debug": true
    },
    "release": {
      "outFile": "build/my-cdn-app.wasm",
      "textFile": "build/my-cdn-app.wat",
      "sourceMap": true,
      "optimizeLevel": 3,
      "shrinkLevel": 0,
      "converge": false,
      "noAssert": false
    }
  },
  "options": {
    "bindings": "esm",
    "use": "abort=abort_proc_exit"
  }
}
```

### Configuration fields

| Field                                  | Required | Description                                                                                    |
| -------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `extends` (wasi-shim)                  | Yes      | Imports WASI shim configuration needed for AssemblyScript compatibility with the host runtime. |
| `options.use: "abort=abort_proc_exit"` | Yes      | Redirects AssemblyScript's built-in `abort` to a WASI-compatible exit. Required for all apps. |
| `options.bindings: "esm"`             | Yes      | Generates ESM JavaScript bindings alongside the wasm binary.                                   |
| `targets.release.outFile`             | Yes      | Path for the compiled release wasm binary.                                                     |
| `targets.debug.outFile`               | Yes      | Path for the debug wasm binary.                                                                |

The `"use": "abort=abort_proc_exit"` option is mandatory. Without it, unhandled aborts in AssemblyScript will not terminate the wasm module correctly on the FastEdge host.

## Build

```bash
# Build release wasm (production)
npm run asbuild:release

# Build debug wasm (includes source maps and debug symbols)
npm run asbuild:debug

# Build both
npm run asbuild
```

The release build produces `build/my-cdn-app.wasm` — this is the binary to deploy to FastEdge. The debug build produces `build/my-cdn-app-debug.wasm` with source maps for local inspection.

## Next Steps

The SDK provides FastEdge-specific host APIs for reading environment variables, secrets, and KV store data from within your CDN app. Import them from `@gcoredev/proxy-wasm-sdk-as/assembly/fastedge`:

```typescript
import {
  getEnv,
  getSecret,
  KvStore,
  getCurrentTime,
} from "@gcoredev/proxy-wasm-sdk-as/assembly/fastedge";
```

For the full API reference — all classes, methods, enums, and return types — see [SDK_API.md](./SDK_API.md).

The `examples/` directory in the SDK repository contains standalone examples covering headers, geo-blocking, JWT validation, KV store queries, and more. Each example is a complete, buildable project following the same structure described in this guide.

## See Also

- [SDK_API.md](./SDK_API.md) — Complete API reference for all classes, methods, enums, and FastEdge host APIs
