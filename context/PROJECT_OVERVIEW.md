# Project Overview

## What Is This?

`@gcoredev/proxy-wasm-sdk-as` is an AssemblyScript SDK for writing CDN filter applications that run on Gcore's [FastEdge](https://gcore.com/fastedge) platform. It's a G-Core fork of the Kong proxy-wasm AssemblyScript SDK, extended with FastEdge-specific host APIs for environment variables, secrets, KV store, and large dictionary values.

Applications written with this SDK compile to WebAssembly and run as proxy filters in the FastEdge CDN proxy layer. They intercept HTTP requests and responses at lifecycle hook points, enabling header manipulation, body transformation, routing, authentication, caching, and more.

## Repository Structure

```
proxy-wasm-sdk-as/
├── CLAUDE.md                    ← Agent instructions (discovery hub)
├── AGENTS.md                    ← Agent governance rules
├── context/                     ← Agent context documents
│   ├── CONTEXT_INDEX.md         ← Read first
│   ├── PROJECT_OVERVIEW.md      ← You are here
│   ├── CHANGELOG.md             ← Agent decision log (grep, don't read)
│   ├── architecture/
│   │   ├── SDK_ARCHITECTURE.md  ← Two-layer design, classes, memory
│   │   └── PROXY_WASM_LIFECYCLE.md ← Lifecycle hooks, dispatch, callbacks
│   ├── development/
│   │   └── BUILD_AND_EXAMPLES.md ← Build, workspace, example pattern
│   └── reference/
│       └── HOST_FUNCTIONS.md    ← Complete host ABI reference
│
├── assembly/                    ← SDK source (AssemblyScript)
│   ├── imports.ts               ← Raw host function declarations (@external)
│   ├── runtime.ts               ← High-level API: classes, enums, helpers
│   ├── exports.ts               ← Wasm entry points (proxy_on_* functions)
│   ├── proxy.ts                 ← Re-exports malloc + exports (consumer entry)
│   ├── index.ts                 ← Public API re-exports from runtime.ts
│   ├── malloc.ts                ← Custom allocator for host buffers
│   └── fastedge/                ← FastEdge-specific extensions
│       ├── dictionary.ts        ← getEnv(), getDictionary()
│       ├── env.ts               ← getEnvVar() (deprecated)
│       ├── secrets.ts           ← getSecret(), getSecretEffectiveAt()
│       ├── kvStore.ts           ← KvStore class (open/get/scan/zrange/zscan/bfExists)
│       ├── index.ts             ← Re-exports all fastedge modules
│       └── utils/
│           ├── runtime.ts       ← getCurrentTime(), setLogLevel(), log()
│           └── listParser.ts    ← Binary list deserializer for multi-value responses
│
├── examples/                    ← 17 standalone example apps
│   ├── README.md                ← Example index with descriptions
│   └── <name>/                  ← Each with package.json, asconfig.json, assembly/
│
├── docs/                        ← Consumer documentation (GENERATED — do not hand-edit)
│   ├── INDEX.md
│   ├── quickstart.md
│   └── SDK_API.md
│
├── fastedge-plugin-source/      ← Plugin pipeline contract
│   ├── manifest.json            ← Source-to-target mapping
│   ├── .generation-config.md    ← Generation instructions
│   └── generate-docs.sh         ← Doc generation script
│
├── build/                       ← Compiled SDK output (gitignored)
├── package.json                 ← npm package config (v1.2.3)
├── asconfig.json                ← AssemblyScript compiler config
├── pnpm-workspace.yaml          ← Workspace: examples/* as members
├── .npmrc                       ← link-workspace-packages=true
├── Makefile                     ← Build and publish shortcuts
└── README.md                    ← User-facing documentation
```

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `assemblyscript` | ^0.28.9 | AssemblyScript compiler (`asc`) |
| `@assemblyscript/wasi-shim` | ^0.1.0 | WASI polyfill (process.env, abort, etc.) |

## How Users Write Apps

1. Create `assembly/index.ts` that imports from the SDK
2. Extend `RootContext` (shared state) and `Context` (per-request)
3. Override lifecycle hooks (`onRequestHeaders`, `onResponseHeaders`, etc.)
4. Call `registerRootContext()` to register the root context factory
5. Export wasm entry points: `export * from "@gcoredev/proxy-wasm-sdk-as/assembly/proxy"`
6. Configure `asconfig.json` with `"use": "abort=abort_proc_exit"` (required)
7. Build with `asc assembly/index.ts --target release`

## AssemblyScript Constraints

This is AssemblyScript, not TypeScript. Key differences:

- No closures over mutable state
- No `try/catch` in most contexts
- Explicit numeric types: `u32`, `i32`, `f64`, `usize`
- Pointer casting via `changetype<usize>()`
- String ↔ ArrayBuffer conversions require `String.UTF8.encode/decode`
- No dynamic property access on objects
- No union types — use explicit overloads or separate functions
- Garbage collection via ITCMS (incremental tri-color mark & sweep)

## FastEdge-Specific APIs

Beyond the standard proxy-wasm ABI, this SDK adds:

| API | Module | Purpose |
|-----|--------|---------|
| `getEnv(name)` | `fastedge/dictionary` | Read env var via WASI (64 KB limit) |
| `getDictionary(name)` | `fastedge/dictionary` | Read large env var via host (2 MB limit) |
| `getSecret(name)` | `fastedge/secrets` | Read secret value |
| `getSecretEffectiveAt(name, slot)` | `fastedge/secrets` | Read secret from rotation slot |
| `KvStore.open(name)` | `fastedge/kvStore` | Open named KV store |
| `kvStore.get(key)` | `fastedge/kvStore` | Get value by key |
| `kvStore.scan(pattern)` | `fastedge/kvStore` | Scan keys by prefix pattern |
| `kvStore.zrangeByScore(key, min, max)` | `fastedge/kvStore` | Range query on sorted set |
| `kvStore.zscan(key, pattern)` | `fastedge/kvStore` | Prefix scan on sorted set |
| `kvStore.bfExists(key, item)` | `fastedge/kvStore` | Bloom filter membership test |
| `getCurrentTime()` | `fastedge/utils/runtime` | Current time in milliseconds |
| `setLogLevel(level)` | `fastedge/utils/runtime` | Set minimum log level |

## Import Patterns

Users import from two paths:

```typescript
// Wasm entry points (REQUIRED — must be re-exported)
export * from "@gcoredev/proxy-wasm-sdk-as/assembly/proxy";

// SDK API (classes, enums, helpers)
import { RootContext, Context, ... } from "@gcoredev/proxy-wasm-sdk-as/assembly";

// FastEdge APIs
import { getEnv } from "@gcoredev/proxy-wasm-sdk-as/assembly/fastedge/dictionary";
import { getSecret } from "@gcoredev/proxy-wasm-sdk-as/assembly/fastedge/secrets";
import { KvStore } from "@gcoredev/proxy-wasm-sdk-as/assembly/fastedge/kvStore";
import { getCurrentTime } from "@gcoredev/proxy-wasm-sdk-as/assembly/fastedge/utils/runtime";
```

---

**Last Updated**: April 2026
