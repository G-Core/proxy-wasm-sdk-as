# Example Validation Tracker

**Purpose:** Track validation of every example on `feature/more-examples-httpbin` before merge to `master`.
**Branch:** `feature/more-examples-httpbin` (15 commits ahead of `origin/master` at tracker creation)
**Created:** 2026-05-12

This file is append-only for per-example notes. The summary grid is updated in place as rows are signed off.

---

## Validation Design: Two Harnesses, One Assertion File

We use **`.live.json` siblings as the single source of truth for assertions** — same file drives both local pass/fail (Phase 1) and edge pass/fail (Phase 2).

```
fixtures/
├── happy-path.test.json     ← scenario input (request, properties, mock origin, env)
├── happy-path.live.json     ← assertion truth (expected logs / status / headers / body)
└── livetest.config.json     ← live-test config (CDN resource id, rule prefix)
```

**Why this works:** the `.live.json` `expected` block is just an assertion spec (logs, status, headers, body, bodyContains, contentType, json, noLogs). Nothing in its content is intrinsically tied to the live edge — `@gcoredev/fastedge-test` produces all the same observables locally (it captures wasm logs inline and synthesizes the response). So one assertion file serves both harnesses.

**Authoring `.live.json` siblings:** apply `gcore-fastedge:debug/reference/inference.md` Step 9 manually per example — derive logs from `log(...)` calls, status/body from `sendLocalResponse(...)`, headers from `add/set/remove` calls. Origin-derivable assertions (`contentType`, `json`, pass-through `status`) are added by hand when we have a mock origin response in the `.test.json` to assert against.

**Local comparator:** a small Node/Bash wrapper (tracked separately, see Task #6) runs `@gcoredev/fastedge-test` on a `.test.json`, parses its output (status/headers/body/logs), loads the sibling `.live.json`, runs the assertions, and reports pass/fail. The wrapper does NOT live in any example's `package.json` — examples stay lean.

---

## How to Use This Tracker

**For a validating agent / session:**

1. Pick an example whose **Local Test** column is `⬜ pending`.
2. Set its row's **Local Test** to `🟡 in-progress` and add an entry to that example's section below (timestamp + agent/session label).
3. Run the validation checks (see [Validation Checklist](#validation-checklist) below).
4. Update the row and append findings to the example's section. Use ✅ pass, ❌ fail, ⚠️ pass-with-issues.
5. When all four checks pass, mark the row's **Sign-off** column with the date.

**Concurrency rule:** one agent per example at a time. Read the row's status before claiming it.

**Live-deploy column:** populated only after **all 17** examples pass locally. We then pick a representative subset spanning distinct FastEdge APIs to prove local↔server parity. Until then this column is `—`.

---

## Validation Checklist (per example)

For each example, verify:

1. **Build** — `pnpm run asbuild` succeeds (already proven across the branch — keep as ✅ baseline).
2. **Assertions** — every `*.test.json` has a sibling `*.live.json` with an `expected` block. Author missing ones by reading `assembly/index.ts` and applying the inference rules (logs ← `log()` calls; status/body ← `sendLocalResponse`; headers ← header mutations; origin-derivable assertions ← hand-authored against the mock `response` in the `.test.json`).
3. **Local Test** — run each `.test.json` via the local comparator wrapper; all sibling `.live.json` assertions pass. If no fixtures exist (jwt, kvStore), author minimal happy-path + at least one meaningful unhappy-path first.
4. **Code Review** — `assembly/index.ts` is well-commented, AssemblyScript-compliant (no closures over mutable state, no try/catch, explicit numeric types), and demonstrates the example's stated concept clearly. No dead code, no unrelated hooks.
5. **README Review** — explains *what FastEdge concept the example teaches*, lists the APIs used, shows expected behavior, and is useful as a learning resource. Builds incrementally on simpler examples where relevant.

**Sign-off** = all five green. **Live Test** is a separate, optional pass run later on selected examples — reuses the exact same `.live.json` files; no new assertions needed.

---

## Summary Grid

Legend: ✅ pass · ⚠️ pass-with-issues · ❌ fail · 🟡 in-progress · ⬜ pending · — not yet scoped

`.live.json coverage` column shows `<authored>/<total>` for `.test.json` files. Target is `n/n` before Local Test.

### Getting Started Examples

| Example | Build | `.test.json` | `.live.json` coverage | Local Test | Code Review | README Review | Live Candidate | Live Test | Sign-off |
|---|---|---|---|---|---|---|---|---|---|
| [helloWorld](../examples/helloWorld/) | ✅ | 1 | 1/1 | 🟡 | ⬜ | ⬜ | — | — | — |
| [headers](../examples/headers/) | ✅ | 1 | 1/1 | ⬜ | ⬜ | ⬜ | — | — | — |
| [body](../examples/body/) | ✅ | 2 | 0/2 | ⬜ | ⬜ | ⬜ | — | — | — |
| [variablesAndSecrets](../examples/variablesAndSecrets/) | ✅ | 1 | 0/1 | ⬜ | ⬜ | ⬜ | — | — | — |
| [logTime](../examples/logTime/) | ✅ | 1 | 1/1 | ⬜ | ⬜ | ⬜ | — | — | — |
| [properties](../examples/properties/) | ✅ | 1 | 1/1 | ⬜ | ⬜ | ⬜ | — | — | — |

### Full Examples

| Example | Build | `.test.json` | `.live.json` coverage | Local Test | Code Review | README Review | Live Candidate | Live Test | Sign-off |
|---|---|---|---|---|---|---|---|---|---|
| [abTesting](../examples/abTesting/) | ✅ | 4 | 0/4 | ⬜ | ⬜ | ⬜ | — | — | — |
| [apiKey](../examples/apiKey/) | ✅ | 4 | 0/4 | ⬜ | ⬜ | ⬜ | — | — | — |
| [cacheControl](../examples/cacheControl/) | ✅ | 7 | 0/7 | ⬜ | ⬜ | ⬜ | — | — | — |
| [cors](../examples/cors/) | ✅ | 3 (+wildcard) | 0/3 | ⬜ | ⬜ | ⬜ | — | — | — |
| [customErrorPages](../examples/customErrorPages/) | ✅ | 6 | 0/6 | ⬜ | ⬜ | ⬜ | — | — | — |
| [geoBlock](../examples/geoBlock/) | ✅ | 3 | 0/3 | ⬜ | ⬜ | ⬜ | — | — | — |
| [geoRedirect](../examples/geoRedirect/) | ✅ | 2 | 0/2 | ⬜ | ⬜ | ⬜ | — | — | — |
| [httpCall](../examples/httpCall/) | ✅ | 1 | 0/1 | ⬜ | ⬜ | ⬜ | — | — | — |
| [jwt](../examples/jwt/) | ✅ | 0 (author first) | 0/0 | ⬜ author both | ⬜ | ⬜ | — | — | — |
| [kvStore](../examples/kvStore/) | ✅ | 0 (author first) | 0/0 | ⬜ author both | ⬜ | ⬜ | — | — | — |
| [largeDictionary](../examples/largeDictionary/) | ✅ | 2 (+.env) | 0/2 | ⬜ | ⬜ | ⬜ | — | — | — |

**Assertion authoring status:** 4 / 17 examples currently have `.live.json` coverage (helloWorld, headers, logTime, properties). Remaining 13 need `.live.json` siblings authored as part of validation.

---

## Validation Phases

### Phase 0 — Tooling (one-time)
Build the local comparator wrapper (Task #6). No example modifications.

### Phase 1 — Local validation (this and following sessions)
Walk through all 17 examples. For each:
1. Author any missing `.test.json` (jwt, kvStore) and `.live.json` siblings.
2. Run via the local comparator. All assertions must pass.
3. Code + README review.
4. Update tracker row.

### Phase 2 — Live-deploy parity (after Phase 1)
Once every row above is ✅ on Local Test, Code Review, and README Review:

1. Open the **Live-deploy candidate selection** section below.
2. Pick a representative subset that exercises each distinct FastEdge feature category at least once:
   - Headers / lifecycle (e.g., `headers` or `helloWorld`)
   - Body manipulation (`body`)
   - Env vars + secrets (`variablesAndSecrets` or `apiKey`)
   - Dictionary / large values (`largeDictionary`)
   - KV Store (`kvStore`)
   - Async HTTP dispatch (`httpCall`)
   - Runtime properties (`properties` or `geoBlock`)
   - JWT (`jwt`)
3. For each selected example, `gcore-fastedge:live-test` reuses the same `.live.json` files Phase 1 already authored. Deploy + sweep + assert.
4. Mark the **Live Candidate** column ✅ and **Live Test** with result.

### Phase 3 — Merge
When every Sign-off cell has a date, recommend merge of `feature/more-examples-httpbin` → `master`.

---

## Live-deploy Candidate Selection

*Populated at start of Phase 2.*

| Example | API Category Covered | Rationale |
|---|---|---|
| _tbd_ | _tbd_ | _tbd_ |

---

## Per-Example Validation Log

Append entries under each example. Format:

```
### YYYY-MM-DD — <agent / session label>

**Assertions:** ✅/⚠️/❌ — <one-line, e.g., "1/1 .live.json authored from source">
**Local Test:** ✅/⚠️/❌ — <one-line result, e.g., "4/4 fixtures pass">
**Code Review:** ✅/⚠️/❌ — <one-liner; link findings if any>
**README Review:** ✅/⚠️/❌ — <one-liner>
**Findings:**
- <issue>: <decision (fixed / deferred / accepted)>
**Next action:** <ready-for-sign-off | needs-rework | blocked-on-X>
```

---

### helloWorld

_in-progress — pilot validation (see Task #7); using to establish the format_

### headers

_pending_

### body

_pending — needs .live.json siblings (0/2)_

### variablesAndSecrets

_pending — needs .live.json sibling (0/1)_

### logTime

_pending_

### properties

_pending_

### abTesting

_pending — needs .live.json siblings (0/4)_

### apiKey

_pending — needs .live.json siblings (0/4)_

### cacheControl

_pending — needs .live.json siblings (0/7)_

### cors

_pending — needs .live.json siblings (0/3)_

### customErrorPages

_pending — needs .live.json siblings (0/6)_

### geoBlock

_pending — needs .live.json siblings (0/3)_

### geoRedirect

_pending — needs .live.json siblings (0/2)_

### httpCall

_pending — needs .live.json sibling (0/1)_

### jwt

_pending — needs both .test.json and .live.json authored (no `fixtures/` directory exists)_

### kvStore

_pending — needs both .test.json and .live.json authored (no `fixtures/` directory exists)_

### largeDictionary

_pending — needs .live.json siblings (0/2)_

---

## Cross-Cutting Findings

Issues that span multiple examples (naming inconsistencies, shared README gaps, SDK API confusion, etc.) go here so we don't repeat the same fix in multiple example sections.

_none yet_

---

**Last Updated:** 2026-05-12 (two-harness design adopted; helloWorld pilot in flight)
