# WebAssembly for Proxies (AssemblyScript SDK)

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/G-Core/proxy-wasm-sdk-as/deploy.yaml)](https://github.com/G-Core/proxy-wasm-sdk-as)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/t/G-Core/proxy-wasm-sdk-as)](https://github.com/G-Core/proxy-wasm-sdk-as)
[![GitHub top language](https://img.shields.io/github/languages/top/G-Core/proxy-wasm-sdk-as)](https://github.com/G-Core/proxy-wasm-sdk-as)
[![GitHub License](https://img.shields.io/github/license/G-Core/proxy-wasm-sdk-as)](https://github.com/G-Core/proxy-wasm-sdk-as/blob/main/LICENSE)
[![NPM Version](https://img.shields.io/npm/v/@gcoredev/proxy-wasm-sdk-as)](https://www.npmjs.com/package/@gcoredev/proxy-wasm-sdk-as)

This is a friendly fork of https://github.com/Kong/proxy-wasm-assemblyscript-sdk/,
mantained to address an incompatibility between the AssemblyScript SDK and the Rust SDK,

It also adds some FastEdge specific functionality.

## How to use this SDK

Create a new project:

```shell
npm init
npm install --save-dev assemblyscript
npx asinit .
```

Include `"use": "abort=abort_proc_exit"` to the `asconfig.json` file as part of
the options passed to `asc` compiler:

```json
{
  "options": {
    "use": "abort=abort_proc_exit"
  }
}
```

Add `"@gcoredev/proxy-wasm-sdk-as": "1.0.2"` to your dependencies then run `npm install`.

## Hello, World

Copy this into assembly/index.ts:

```ts
export * from "@gcoredev/proxy-wasm-sdk-as/assembly/proxy";
import {
  RootContext,
  Context,
  registerRootContext,
  FilterHeadersStatusValues,
  stream_context,
} from "@gcoredev/proxy-wasm-sdk-as/assembly";

class AddHeaderRoot extends RootContext {
  createContext(context_id: u32): Context {
    return new AddHeader(context_id, this);
  }
}

class AddHeader extends Context {
  constructor(context_id: u32, root_context: AddHeaderRoot) {
    super(context_id, root_context);
  }
  onResponseHeaders(a: u32, end_of_stream: boolean): FilterHeadersStatusValues {
    const root_context = this.root_context;
    if (root_context.getConfiguration() == "") {
      stream_context.headers.response.add("hello", "world!");
    } else {
      stream_context.headers.response.add(
        "hello",
        root_context.getConfiguration()
      );
    }
    return FilterHeadersStatusValues.Continue;
  }
}

registerRootContext((context_id: u32) => {
  return new AddHeaderRoot(context_id);
}, "add_header");
```

## Build

To build, simply run:

```
npm run asbuild
```

build results will be in the build folder. `debug.wasm` and `release.wasm` are the compiled
file that we will use (you only need one of them, if unsure use `release.wasm`).

## Run

These binaries can then be uploaded and attached to your CDN applications within the FastEdge UI portal.

For some binaries (the above example for instance) you can test localy using envoy.

Please see [Envoy.md](./ENVOY.md)

## Examples

For more examples on how to use this `proxy-wasm-sdk-as` please see our [examples repo](https://github.com/G-Core/FastEdge-examples/tree/main/assemblyscript)
