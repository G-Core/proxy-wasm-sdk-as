# @gcoredev/proxy-wasm-sdk-as Documentation

AssemblyScript SDK for writing proxy-wasm filter plugins that run on the FastEdge CDN platform. Version 1.2.0.

## Documents

| File            | Description                                                                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quickstart.md` | Getting started: project setup, `asconfig.json` build configuration, hello-world CDN filter example, building to WebAssembly                                                                                  |
| `SDK_API.md`    | Complete API reference: proxy-wasm lifecycle (`RootContext`/`Context`), lifecycle hooks, return enums, header/body/property manipulation, FastEdge host APIs (env vars, secrets, KV store, runtime utilities) |

## Suggested Reading Order

1. **`quickstart.md`** — Set up a new project, configure the build, and deploy your first CDN filter.
2. **`SDK_API.md`** — Full API reference for all lifecycle hooks, host APIs, and FastEdge extensions once you are ready to build real functionality.
