# Hello World — Minimal CDN App

The simplest possible FastEdge CDN application using the AssemblyScript proxy-wasm SDK. All four lifecycle hooks are present with pass-through implementations.

This example serves as the base skeleton for scaffolding new CDN applications.

## Build

```bash
pnpm install
pnpm run asbuild
```

Output: `build/helloWorld.wasm` (release), `build/helloWorld-debug.wasm` (debug).
