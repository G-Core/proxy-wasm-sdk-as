# Build System & Examples

## SDK Build

### Commands

```sh
pnpm install                  # Install dependencies
pnpm run asbuild              # Build debug + release
pnpm run asbuild:debug        # Debug only
pnpm run asbuild:release      # Release only
pnpm run generate:docs        # Generate consumer docs
```

### Build Output

```
build/
├── debug.wasm      ← Debug build with source maps
├── debug.wat       ← WAT text format (debug)
├── release.wasm    ← Optimized production build
├── release.wat     ← WAT text format (release)
├── release.js      ← JS bindings (ESM)
└── release.d.ts    ← TypeScript declarations
```

### asconfig.json (Root)

The root `asconfig.json` extends `@assemblyscript/wasi-shim/asconfig.json` and defines:

- **debug target:** source maps at `http://127.0.0.1:8081/build/untouched.wasm.map`
- **release target:** `optimizeLevel: 3`, `shrinkLevel: 0`, source maps enabled
- **Critical option:** `"use": "abort=abort_proc_exit"` — required for WASI error handling

### Compiler

The `asc` command comes from the `assemblyscript` devDependency. It compiles `.ts` files to `.wasm` + `.wat`.

---

## pnpm Workspace

The repo uses pnpm workspaces for local development:

**`pnpm-workspace.yaml`:**
```yaml
packages:
  - "examples/*"
```

**`.npmrc`:**
```
link-workspace-packages=true
```

This means:
- `pnpm install` from root links the SDK locally into all examples
- Examples declare `"@gcoredev/proxy-wasm-sdk-as": "^1.2.3"` (published version)
- During development, pnpm resolves this to the local workspace root instead of npm
- When an example is copied out of the repo, `npm install` pulls from npm — fully standalone

---

## Example Structure

Each of the 17 examples in `examples/` is an independent package:

```
examples/<name>/
├── package.json         ← SDK dependency + build scripts
├── asconfig.json        ← Compiler config with named outputs
├── assembly/
│   └── index.ts         ← Application code
├── README.md            ← Description, env vars, build instructions
├── build/               ← Compiled output (gitignored)
└── node_modules/        ← Dependencies (gitignored)
```

### Example package.json Pattern

```json
{
  "name": "fastedge-as-example-<name>",
  "version": "1.0.0",
  "description": "FastEdge AssemblyScript example: <Name> — <one-line description>",
  "scripts": {
    "asbuild:debug": "asc assembly/index.ts --target debug",
    "asbuild:release": "asc assembly/index.ts --target release",
    "asbuild": "npm run asbuild:debug && npm run asbuild:release"
  },
  "dependencies": {
    "@gcoredev/proxy-wasm-sdk-as": "^1.2.3"
  },
  "devDependencies": {
    "@assemblyscript/wasi-shim": "^0.1.0",
    "assemblyscript": "^0.28.9"
  }
}
```

### Example asconfig.json Pattern

```json
{
  "extends": "./node_modules/@assemblyscript/wasi-shim/asconfig.json",
  "targets": {
    "debug": {
      "outFile": "build/<name>-debug.wasm",
      "textFile": "build/<name>-debug.wat",
      "sourceMap": true,
      "debug": true
    },
    "release": {
      "outFile": "build/<name>.wasm",
      "textFile": "build/<name>.wat",
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

### Example assembly/index.ts Pattern

```typescript
export * from "@gcoredev/proxy-wasm-sdk-as/assembly/proxy";

import {
  Context, FilterHeadersStatusValues,
  log, LogLevelValues, registerRootContext, RootContext,
  stream_context
} from "@gcoredev/proxy-wasm-sdk-as/assembly";

class MyRoot extends RootContext {
  createContext(context_id: u32): Context {
    return new MyApp(context_id, this);
  }
}

class MyApp extends Context {
  onRequestHeaders(a: u32, end_of_stream: bool): FilterHeadersStatusValues {
    // your logic here
    return FilterHeadersStatusValues.Continue;
  }
}

registerRootContext(
  (context_id: u32) => new MyRoot(context_id),
  "myApp"
);
```

---

## Adding a New Example

1. Create `examples/<name>/` with `package.json`, `asconfig.json`, `assembly/index.ts`, `README.md`
2. Follow the patterns above — use `^1.2.3` for the SDK dep (not `file:../..`)
3. Add `[← Back to examples](../README.md)` as the first line of `README.md`
4. Add the example to `examples/README.md` in the appropriate table (Getting Started or Full Examples)
5. Build names must match: `build/<name>.wasm` (release), `build/<name>-debug.wasm` (debug)
6. Test: `cd examples/<name> && pnpm install && pnpm run asbuild`

---

## Publishing

The SDK is published as `@gcoredev/proxy-wasm-sdk-as` on npm.

**Published files** (from `package.json` `"files"` field):
- `/assembly` — all source files
- `package-lock.json`
- `index.js`

The `Makefile` provides shortcuts for building and publishing.

---

**Last Updated**: April 2026
