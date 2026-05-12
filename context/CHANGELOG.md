# Changelog (Agent Decision Log)

Use `grep` to search this file — do not read linearly as it grows.

## [2026-05-12] — Symmetric set-equality in `examples/headers` diff (parity)

### Overview
AS port of the same fix landing in FastEdge-sdk-rust today. The strict diff in `examples/headers/assembly/index.ts` only flagged extras (`new-header-*` entries in actual but not in expected); a WASM that *failed* to add an expected header was never iterated and `diff.size > 0` didn't fire, so the 552 branch silently passed on a real regression. Refactored `validateHeaders` to return both `missing` and `extra` via a `HeaderDiff` class, preserving the deliberate `new-header-` prefix scoping that lets application-style headers (e.g. set-cookie) tag along without being enumerated in `expected`. fastedge-test ported the same change into its in-repo `as/cdn-headers/assembly/headers.ts`.

### Decisions
- New `HeaderDiff` class with `missing: Set<string>` and `extra: Set<string>` fields (constructor-initialised because AS's class-field initialisers don't reliably handle `new Set<string>()`). Single-pass `validateHeaders`: walks actual headers once to populate `extra` and `actualNewHeaders`, then walks `expectedHeaders` once to populate `missing`.
- Preserved the `new-header-` prefix gate so the AS strict-validation app continues to tolerate unrelated added headers without enumerating them. Without the gate, set-cookie additions in the response phase would trip the diff.
- Call sites in both hooks now trigger 552 when `diff.missing.size > 0 || diff.extra.size > 0` and log both for diagnosability.

### Changes
- `examples/headers/assembly/index.ts` — `HeaderDiff` class added; `validateHeaders` refactored to compute both directions; `onRequestHeaders` and `onResponseHeaders` call sites updated. `pnpm run asbuild:release` clean.

### Docgen pipeline tooling
- `fastedge-plugin-source/generate-docs.sh` + `.gitignore` — parity port of the `docs/.failures/` capture + preamble-salvage mechanism from the `fastedge-plugin` `generate-docs-template.sh` source-of-truth (see that repo's commit for the full rationale). Sonnet's intermittent "outputting verbatim" preamble leak in Update mode is now stripped on-the-fly rather than triggering a retry.

---

## [2026-04-21] — Backfilled tsconfig.json Across Examples

### Overview
Added `tsconfig.json` to the 7 example projects that lacked one, unifying IDE/LSP DX across all 17 examples.

### Decisions
- `tsconfig.json` is IDE-only: `asc` consumes `asconfig.json`, not tsconfig. Adding it has zero compile impact.
- Content is identical across examples: extends `assemblyscript/std/assembly.json`, includes `./**/*.ts`. The extended config provides AS's global type declarations so IDEs stop flagging `u32`, `bool`, `usize`, `String.UTF8`, etc. as errors.
- Convention captured in `BUILD_AND_EXAMPLES.md` (directory layout + new `tsconfig.json` pattern section + "Adding a New Example" checklist) and `.generation-config.md` (quickstart source files + required content) so future examples include it by default.

### Changes
- Added identical `tsconfig.json` to: `abTesting`, `apiKey`, `cacheControl`, `cors`, `customErrorPages`, `helloWorld`, `largeDictionary`.
- `context/development/BUILD_AND_EXAMPLES.md`: added `tsconfig.json` to the example layout diagram, added a new "Example tsconfig.json Pattern" section, updated "Adding a New Example" step 1.
- `fastedge-plugin-source/.generation-config.md`: added `examples/helloWorld/tsconfig.json` as a quickstart source file; updated Required Content to document it.

## [2026-04-21] — HTTP Call Resume Contract Documented

### Overview
Corrected documentation and the `httpCall` example to reflect FastEdge's host-driven resume model, which differs from canonical proxy-wasm.

### Decisions
- Canonical pattern is **B2**: use the `cb` argument to `httpCall`, do NOT override `RootContext.onHttpCallResponse`. Chose over a Rust-mirroring override pattern because `proxy_on_http_call_response` in the AS SDK dispatches to the singleton root (not per-request context), so the SDK's default `onHttpCallResponse` (which routes through `cb` with `setEffectiveContext` correctly applied) is the path that reaches per-Context logic. Mirroring Rust's `Context`-method override would require either bypassing or duplicating that routing.
- Callback is a **named module-level function**, not an anonymous arrow. Named functions cannot close over mutable state, which structurally satisfies AssemblyScript's closure restriction (instead of relying on inspection to confirm no mutable capture) and keeps the `httpCall(...)` call site readable. If Context state is needed inside the handler, downcast `ctx as MyContext`.
- Instance-field latch (`httpCallDispatched`) is load-bearing, not cosmetic. Without it, re-invocation of the originating hook dispatches a new HTTP call on every re-entry and loops until timeout.
- Instance fields persist across the re-invocation (same hook, same Context, same wasm invocation chain) — a narrower guarantee than "persist across hooks" (which does not hold). Documented as an explicit exception to Hook State Isolation.
- `BaseContext.continueRequest()` / `proxy_continue_stream` is ceremonial on FastEdge: no-op host impl, resume is implicit. Do not suggest it as the resume mechanism.

### Changes
- `context/architecture/PROXY_WASM_LIFECYCLE.md`: added a divergence banner in Overview; rewrote "Async HTTP Callbacks" section with full host-driven flow, latch pattern, state-isolation interaction, and override anti-patterns.
- `context/reference/HOST_FUNCTIONS.md`: corrected `proxy_continue_stream`, `proxy_close_stream`, and `proxy_http_call` table entries to reflect FastEdge runtime behavior.
- `fastedge-plugin-source/.generation-config.md`: added "CRITICAL — HTTP Call Resume Contract" block under `docs/SDK_API.md` → Required Content; updated the `httpCall` bullet to reference it. Regenerate `docs/SDK_API.md` to propagate to consumer docs.
- `examples/httpCall/assembly/index.ts`: refactored to B2 pattern — removed `onHttpCallResponse` override on root, extracted response handling into a named module-level function `handleHttpCallResponse` (avoiding a name collision with the SDK's `RootContext.onHttpCallResponse` method), renamed `httpCallDone` → `httpCallDispatched`, added a comment explaining the re-entry contract.
- `examples/httpCall/README.md`: updated "What it does" and "Key concepts" to describe the latch + re-invocation model and call out the divergence from canonical proxy-wasm.

## [2026-04-20] — Context System Bootstrap

### Overview
Created the discovery-based context system for agent onboarding.

### Changes
- Added `AGENTS.md` governance rules
- Rewrote `CLAUDE.md` to follow discovery pattern (matching FastEdge-sdk-rust)
- Created `context/CONTEXT_INDEX.md` as the discovery hub
- Created `context/PROJECT_OVERVIEW.md` with repo structure and key concepts
- Created `context/architecture/SDK_ARCHITECTURE.md` covering two-layer design
- Created `context/architecture/PROXY_WASM_LIFECYCLE.md` covering lifecycle hooks
- Created `context/development/BUILD_AND_EXAMPLES.md` covering build and workspace
- Created `context/reference/HOST_FUNCTIONS.md` covering full ABI surface
