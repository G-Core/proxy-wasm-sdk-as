# WebAssembly for Proxies (AssemblyScript SDK)

This is a friendly fork of https://github.com/Kong/proxy-wasm-assemblyscript-sdk/,
temporarily mantained to address an incompatibility between the AssemblyScript
SDK and the Rust SDK.

## How to use this SDK

Create a new project:

```shell
npm init
npm install --save-dev assemblyscript
npx asinit .
```

Include `"use": "abort=abort_proc_exit"` to the `asconfig.json` file as part of
the options passed to `asc` compiler:

```
{
  "options": {
    "use": "abort=abort_proc_exit"
  }
}
```

Add `"@gcoredev/proxy-wasm-sdk-as": "0.0.1"` to your dependencies then run `npm install`.

## Hello, World

Copy this into assembly/index.ts:

```ts
export * from "@gcoredev/proxy-wasm-sdk-as/proxy";
import {
  RootContext,
  Context,
  registerRootContext,
  FilterHeadersStatusValues,
  stream_context,
} from "@gcoredev/proxy-wasm-sdk-as";

class AddHeaderRoot extends RootContext {
  createContext(context_id: u32): Context {
    return new AddHeader(context_id, this);
  }
}

class AddHeader extends Context {
  constructor(context_id: u32, root_context: AddHeaderRoot) {
    super(context_id, root_context);
  }
  onResponseHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
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

## build

To build, simply run:

```
npm run asbuild
```

build results will be in the build folder. `untouched.wasm` and `optimized.wasm` are the compiled
file that we will use (you only need one of them, if unsure use `optimized.wasm`).

## Run

Configure envoy with your filter:

```yaml
- name: envoy.filters.http.wasm
  config:
    config:
      name: "add_header"
      root_id: "add_header"
      configuration: "what ever you want"
      vm_config:
        vm_id: "my_vm_id"
        runtime: "envoy.wasm.runtime.v8"
        code:
          local:
            filename: /PATH/TO/CODE/build/optimized.wasm
        allow_precompiled: false
```
