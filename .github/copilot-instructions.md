# Copilot PR Review Instructions — proxy-wasm-sdk-as

## Constitution

This repository is `@gcoredev/proxy-wasm-sdk-as` — the AssemblyScript SDK for building CDN apps on Gcore FastEdge using the proxy-wasm ABI. It provides RootContext/Context classes, lifecycle hooks, and FastEdge host API wrappers (KV store, secrets, dictionary, environment variables).

### Principles (enforce during review)

1. **AssemblyScript, not TypeScript** — No closures over mutable state, no `try/catch`, explicit numeric types (`u32`, `i32`), `changetype<usize>()` for pointer casting. Flag TypeScript patterns that don't compile in AS.
2. **No over-engineering** — Simple solutions over complex abstractions. Three similar lines > premature abstraction.
3. **Required exports** — Every app must include `export * from "@gcoredev/proxy-wasm-sdk-as/assembly/proxy"`. Flag missing re-exports.
4. **SDK dependency versioning** — Examples must use `"^1.2.3"` (published npm version), never `"file:../.."`. Flag local file references.
5. **Required abort config** — `asconfig.json` must include `"use": "abort=abort_proc_exit"`. Flag missing abort config.

### Public API contract

The public API surface is defined by:
- `assembly/index.ts` — Public re-exports (context classes, enums, helpers)
- `assembly/runtime.ts` — RootContext, Context, StreamContext classes and enums
- `assembly/exports.ts` — Wasm entry points (`proxy_on_*` functions)
- `assembly/fastedge/` — FastEdge-specific extensions (KV store, secrets, dictionary, env, utils)

Changes to these surfaces require updated `docs/`, updated tests, and a semver-appropriate version bump.

## Generated Content — `docs/`

Files in `docs/` are **machine-generated** from source code by `./fastedge-plugin-source/generate-docs.sh`. They must not be edited by hand — manual changes will be silently overwritten on the next generation run.

### When reviewing PRs that touch `docs/`:

- **Never** suggest manual edits to any file in `docs/`
- If docs are stale or incorrect, suggest: **Run `./fastedge-plugin-source/generate-docs.sh`**
- If the generated output itself is wrong (e.g., wrong structure, missing section), the fix belongs in `fastedge-plugin-source/.generation-config.md`, not in `docs/` directly
- If a PR modifies `docs/` files without a corresponding source code change, flag it — the change should come from the generation script, not a hand-edit

### When reviewing PRs that change source code covered by `docs/`:

- Check whether the change affects the public API or user-facing behavior
- If yes, and `docs/` was not regenerated in the same PR, **request changes** with:
  > Source code affecting public API was changed but docs/ was not regenerated.
  > Run: `./fastedge-plugin-source/generate-docs.sh`

## Documentation Freshness

### Public API changes (must regenerate docs/)
- New, modified, or removed exports in `assembly/index.ts`
- Changes to RootContext/Context/StreamContext classes in `assembly/runtime.ts`
- Changes to lifecycle hooks in `assembly/exports.ts`
- Changes to FastEdge host APIs in `assembly/fastedge/`
- Changes to host function declarations in `assembly/imports.ts`
- Changes to `package.json` (version, exports)

### Mapping: code location → doc file

| Code path                                        | Doc file           |
| ------------------------------------------------ | ------------------ |
| `assembly/runtime.ts` (context classes, enums)   | `docs/SDK_API.md`  |
| `assembly/exports.ts` (lifecycle hooks)          | `docs/SDK_API.md`  |
| `assembly/imports.ts` (host function decls)      | `docs/SDK_API.md`  |
| `assembly/index.ts` (public re-exports)          | `docs/SDK_API.md`  |
| `assembly/fastedge/kvStore.ts`                   | `docs/SDK_API.md`  |
| `assembly/fastedge/secrets.ts`                   | `docs/SDK_API.md`  |
| `assembly/fastedge/dictionary.ts`                | `docs/SDK_API.md`  |
| `assembly/fastedge/env.ts`                       | `docs/SDK_API.md`  |
| `package.json` (version, exports)                | `docs/INDEX.md`    |
| `fastedge-plugin-source/manifest.json`           | `.github/copilot-instructions.md` |

### Violation example

> PR adds a new method to `StreamContext` in `assembly/runtime.ts` but `docs/SDK_API.md` was not regenerated → **request changes**. Run `./fastedge-plugin-source/generate-docs.sh` before merge.

### Quickstart protection

If any public API signature or behavior changes, check whether `docs/quickstart.md` examples are still accurate. Request regeneration if examples would no longer work against the updated code.

## Pipeline source contract

If `fastedge-plugin-source/manifest.json` lists source files that overlap with files changed in this PR, request that `docs/` is regenerated (run `./fastedge-plugin-source/generate-docs.sh`) to keep the plugin pipeline's source material current.

## Quality Rules

- All code must be valid AssemblyScript — flag TypeScript-only patterns (closures, try/catch, dynamic property access)
- Examples must use the published SDK version (`"^1.2.3"`), not `"file:../.."` references
- Examples must include `export * from "@gcoredev/proxy-wasm-sdk-as/assembly/proxy"`
- No marketing language in documentation — precise, technical prose only
