# AI Agent Instructions for FastEdge AssemblyScript SDK

## Governance (REQUIRED)

Read `AGENTS.md` for company-wide agent rules. These are mandatory and override any conflicting behavior. Key rules: never go beyond the assigned task, never change code that was not asked to change, never "improve" or "optimize" without a clear request, always distinguish observations from action requests.

---

## CRITICAL: Read Smart, Not Everything

**DO NOT read all context files upfront.** This repository uses a **discovery-based context system** to minimize token usage while maximizing effectiveness.

---

## Getting Started: Discovery Pattern

### Step 1: Read the Index (REQUIRED — ~120 lines)

**First action when starting work:** Read `context/CONTEXT_INDEX.md`

This lightweight file gives you:
- Project quick start (what this repo does in 10 lines)
- Documentation map organized by topic with sizes
- Decision tree for what to read based on your task
- Search patterns for finding information

### Step 2: Read Based on Your Task (JUST-IN-TIME)

Use the decision tree in CONTEXT_INDEX.md to determine what to read. **Only read what's relevant to your current task.**

**Examples:**

**Task: "Add a new FastEdge host API (e.g., cache)"**
- Read: `context/architecture/SDK_ARCHITECTURE.md` (FastEdge layer section)
- Read: `context/reference/HOST_FUNCTIONS.md` (FastEdge-specific APIs)
- Use: `assembly/fastedge/kvStore.ts` as implementation template

**Task: "Fix lifecycle hook dispatch"**
- Read: `context/architecture/PROXY_WASM_LIFECYCLE.md` (dispatch mechanism)
- Read: `assembly/exports.ts` directly

**Task: "Add a new example"**
- Browse: `examples/helloWorld/` for the template structure
- Read: `context/development/BUILD_AND_EXAMPLES.md` (adding new examples section)

**Task: "Understand the codebase"**
- Read: `context/PROJECT_OVERVIEW.md` (~120 lines)
- Skim: `context/architecture/SDK_ARCHITECTURE.md` (two-layer design)

### Step 3: Search, Don't Read Everything

**Use grep and search tools** instead of reading large files linearly:

- **CHANGELOG.md**: Will grow over time — always grep, never read end-to-end
- **Architecture docs** (~130-170 lines): Read specific sections by heading
- **Source code**: Navigate by module (`assembly/`, `assembly/fastedge/`)

---

## Decision Tree Reference

**Quick lookup for common tasks:**

| Task Type | What to Read |
|-----------|-------------|
| **Adding a FastEdge API** | SDK_ARCHITECTURE (FastEdge layer) + HOST_FUNCTIONS + existing module as template |
| **Modifying lifecycle hooks** | PROXY_WASM_LIFECYCLE + `assembly/exports.ts` |
| **Working with headers** | SDK_ARCHITECTURE (StreamContext section) + `examples/headers/` |
| **Working with KV/secrets/dictionary** | SDK_ARCHITECTURE (FastEdge layer) + matching example |
| **Adding an example** | BUILD_AND_EXAMPLES (example pattern) + `examples/helloWorld/` as template |
| **Changing build config** | BUILD_AND_EXAMPLES + root `asconfig.json` |
| **Understanding the system** | PROJECT_OVERVIEW (~120 lines) |
| **Debugging host calls** | HOST_FUNCTIONS (result codes) + SDK_ARCHITECTURE (memory management) |
| **Modifying context classes** | SDK_ARCHITECTURE (context hierarchy) + `assembly/runtime.ts` |
| **Updating consumer docs** | `fastedge-plugin-source/.generation-config.md` (do NOT hand-edit `docs/`) |

---

## Platform Constraints (MUST follow in all code and examples)

- **AssemblyScript, not TypeScript** — no closures over mutable state, no `try/catch`, explicit numeric types (`u32`, `i32`, `f64`), `changetype<usize>()` for pointer casting
- **Required wasm export** — every app must do `export * from "@gcoredev/proxy-wasm-sdk-as/assembly/proxy"`
- **Required abort config** — `asconfig.json` must include `"use": "abort=abort_proc_exit"`
- **SDK dependency** — examples use `"^1.2.3"` (published npm version), NOT `"file:../.."`
- **Single-threaded** — wasm execution is single-threaded; global state in `runtime.ts` is safe

---

## Anti-Patterns (What NOT to Do)

**Don't:** Read all 6 context docs upfront (~710 lines wasted if you only need one)
**Don't:** Read `assembly/runtime.ts` end-to-end for a simple FastEdge API change
**Don't:** Hand-edit `docs/` files — they are generated; update `.generation-config.md` instead
**Don't:** Use `"file:../.."` for SDK dependency in examples — use the published version
**Don't:** Use TypeScript features unavailable in AssemblyScript (closures, try/catch, dynamic access)

**Do:** Read `context/CONTEXT_INDEX.md` first — always
**Do:** Use grep to search CHANGELOG and large source files
**Do:** Read `examples/` for real-world usage patterns
**Do:** Read only sections relevant to your current task
**Do:** Follow the decision tree for targeted reading

---

## Critical Working Practices

### Task Checklists (ALWAYS USE)

When starting any non-trivial task (multi-step, multiple files, features, etc.):

1. Use `TaskCreate` to break work into discrete steps
2. Mark tasks `in_progress` when starting, `completed` when done
3. This helps track progress and prevents missed steps

### Parallel Agents

For independent work, spawn parallel agents:
- Research different subsystems simultaneously
- Build multiple examples at once
- Read multiple source files concurrently

### Documentation Maintenance

When you make significant changes, update the relevant context docs:

1. **After adding a feature:** Add a CHANGELOG.md entry
2. **After changing architecture:** Update the relevant architecture doc
3. **After changing build config:** Update BUILD_AND_EXAMPLES.md
4. **After adding an example:** Update `examples/README.md`

**CHANGELOG entry format:**
```markdown
## [YYYY-MM-DD] — Brief Description

### Overview
One sentence summary.

### Changes
- Bullet list of what changed
```

---

## Context Organization

```
proxy-wasm-sdk-as/
├── CLAUDE.md                              ← YOU ARE HERE
├── AGENTS.md                              ← Governance rules (REQUIRED)
├── context/
│   ├── CONTEXT_INDEX.md                   ← Read first (discovery hub)
│   ├── PROJECT_OVERVIEW.md                ← New to codebase? Start here
│   ├── CHANGELOG.md                       ← Agent decision log (grep, don't read)
│   ├── architecture/
│   │   ├── SDK_ARCHITECTURE.md            ← Two-layer design, classes, memory
│   │   └── PROXY_WASM_LIFECYCLE.md        ← Lifecycle hooks, dispatch, callbacks
│   ├── development/
│   │   └── BUILD_AND_EXAMPLES.md          ← Build system, workspace, example pattern
│   └── reference/
│       └── HOST_FUNCTIONS.md              ← Complete host ABI reference
├── assembly/                              ← SDK source (AssemblyScript)
│   ├── imports.ts                         ← Raw host function declarations
│   ├── runtime.ts                         ← High-level API: classes, enums, helpers
│   ├── exports.ts                         ← Wasm entry points (proxy_on_*)
│   ├── proxy.ts                           ← Consumer re-export entry point
│   ├── index.ts                           ← Public API re-exports
│   ├── malloc.ts                          ← Custom allocator for host buffers
│   └── fastedge/                          ← FastEdge-specific extensions
├── examples/                              ← 17 standalone example apps
├── docs/                                  ← Consumer docs (GENERATED — do not hand-edit)
├── fastedge-plugin-source/                ← Plugin pipeline contract
├── build/                                 ← Compiled SDK output (gitignored)
├── package.json                           ← npm package config (v1.2.3)
├── asconfig.json                          ← AssemblyScript compiler config
├── pnpm-workspace.yaml                    ← Workspace: examples/* as members
└── Makefile                               ← Build and publish shortcuts
```

---

## Search Tips

**Find host function declarations:**
```bash
grep -r "@external" assembly/imports.ts
```

**Find public API surface:**
```bash
grep -r "export" assembly/index.ts
```

**Find FastEdge API usage in examples:**
```bash
grep -r "getEnv\|getSecret\|KvStore\|getDictionary" examples/
```

**Find context class methods:**
```bash
grep -r "class.*extends" assembly/runtime.ts
```

**Find example entry points:**
```bash
grep -r "registerRootContext" examples/
```

---

## Quick Reference

**Tech Stack:** AssemblyScript 0.28, WASI-shim, proxy-wasm ABI v0.2.1
**Package:** `@gcoredev/proxy-wasm-sdk-as` v1.2.3 on npm
**Node:** pnpm for workspace management
**License:** Apache-2.0

**Common Commands:**

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install deps (workspace links examples) |
| `pnpm run asbuild` | Build debug + release wasm |
| `pnpm run asbuild:release` | Release build only |
| `pnpm run generate:docs` | Regenerate consumer docs |
| `cd examples/<name> && pnpm run asbuild` | Build single example |

---

## Summary

1. Read `AGENTS.md` for governance rules
2. Read `context/CONTEXT_INDEX.md` first
3. Use the decision tree to find relevant docs
4. Read only what you need for your current task
5. Use grep for CHANGELOG and large files
6. Update context docs after significant changes
7. Use TaskCreate for multi-step work

---

**Last Updated**: April 2026
