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

**Local comparator:** lives at `fastedge-coordinator/tools/fixture-validator/` (coordinator-level dev tool, not in any example's `package.json` — examples stay lean). It's a thin Node script (~210 lines) that loads `@gcoredev/fastedge-test`, calls `runner.callFullFlow(...)` for the `.test.json`, then maps each `.live.json` `expected` field (logs / noLogs / status / headers / body / bodyContains / contentType / json) to an assertion. Header semantics mirror `@gcoredev/fastedge-test/assertions`: a string expectation matches if any actual value equals it; a `string[]` expectation requires exact ordered array match. Currently uses `IWasmRunner.callFullFlow` directly off `createRunner()` rather than the `./test` subpath's `runFlow` helper — workaround for a packaging bug in fastedge-test@0.2.1's `./test` ESM bundle.

**Invocation:** `node tools/fixture-validator/index.mjs <example-dir-or-test-json>...`. Wasm is auto-resolved by walking up from the `.test.json` to the nearest `package.json` + `build/` and picking `*-debug.wasm`; `--wasm <path>` overrides.

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
| [helloWorld](../examples/helloWorld/) | ✅ | 1 | 1/1 | ✅ | ⚠️ | ⚠️ | — | — | — |
| [headers](../examples/headers/) | ✅ | 1 | 1/1 | ✅ | ⚠️ | ⚠️ | — | — | — |
| [body](../examples/body/) | ✅ | 2 | 2/2 | ✅ | ⚠️ | ⚠️ | — | — | — |
| [variablesAndSecrets](../examples/variablesAndSecrets/) | ✅ | 1 | 1/1 | ✅ | ⚠️ | ⚠️ | — | — | — |
| [logTime](../examples/logTime/) | ✅ | 1 | 1/1 | ✅ | ⚠️ | ⚠️ | — | — | — |
| [properties](../examples/properties/) | ✅ | 1 | 1/1 | ❌ | ⬜ | ⬜ | — | — | — |

### Full Examples

| Example | Build | `.test.json` | `.live.json` coverage | Local Test | Code Review | README Review | Live Candidate | Live Test | Sign-off |
|---|---|---|---|---|---|---|---|---|---|
| [abTesting](../examples/abTesting/) | ✅ | 4 | 4/4 | ⚠️ | ⚠️ | ⚠️ | — | — | — |
| [apiKey](../examples/apiKey/) | ✅ | 4 | 4/4 | ⚠️ | ⚠️ | ⚠️ | — | — | — |
| [cacheControl](../examples/cacheControl/) | ✅ | 7 | 7/7 | ✅* | ⚠️ | ⚠️ | — | — | — |
| [cors](../examples/cors/) | ✅ | 3 (+wildcard) | 4/4 | ✅ | ⚠️ | ⚠️ | — | — | — |
| [customErrorPages](../examples/customErrorPages/) | ✅ | 6 | 6/6 | ✅* | ⚠️ | ⚠️ | — | — | — |
| [geoBlock](../examples/geoBlock/) | ✅ | 3 | 3/3 | ⚠️ | ⚠️ | ⚠️ | — | — | — |
| [geoRedirect](../examples/geoRedirect/) | ✅ | 2 | 2/2 | ❌ | ❌ | ⚠️ | — | — | — |
| [httpCall](../examples/httpCall/) | ✅ | 1 | 1/1 | ✅ | ⚠️ | ⚠️ | — | — | — |
| [jwt](../examples/jwt/) | ✅ | 5 (authored) | 5/5 | ✅ | ⚠️ | ⚠️ | — | — | — |
| [kvStore](../examples/kvStore/) | ✅ | 0 | 0/0 | 🚫 runner gap | ⬜ | ⬜ | ✓ required | — | — |
| [largeDictionary](../examples/largeDictionary/) | ✅ | 2 (+.env) | 2/2 | ✅ | ⚠️ | ⚠️ | — | — | — |

**Assertion authoring status:** **16 / 17 examples have authored `.live.json` coverage** (all except kvStore). kvStore is deferred to Phase 2 (live-test only) per CC-12 (runner doesn't implement KV API). Phase 1 fixture authoring is **complete**. Note: per the cross-cutting finding below, the pre-authored 4 (helloWorld/headers/logTime/properties) were **claimed** coverage, not verified — headers needed rewriting once the comparator ran it.

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

#### 2026-05-13 — comparator pilot (Phase 0 / Task #6)

**Assertions:** ✅ — 1/1 pre-existing `.live.json` accepted as-is
**Local Test:** ✅ — 1/1 fixture passes
**Findings (Local Test):** none

#### 2026-05-13 — code + README review

**Code Review:** ⚠️ — pass-with-issues (1 finding)
**README Review:** ⚠️ — pass-with-issues (3 findings)

**Findings — Code Review (`assembly/index.ts`):**

- **HW-C1 (Style):** No `setLogLevel(...)` call. Other examples (`body`, `headers`) set INFO explicitly. As the scaffolding skeleton, minimality may be deliberate — but the choice should be conscious and ideally documented. Pick a convention (set INFO with a comment, or rely on default and document the default) and apply consistently across "starter" examples.

**Findings — README Review:**

- **HW-R1:** No "What it does" section. Every other example I've reviewed has one. As the *first* example a learner encounters, leaving the lifecycle hook pattern implicit is a missed pedagogy opportunity. Should briefly enumerate: "four lifecycle hooks, each logs at INFO, all return Continue."
- **HW-R2:** No "Deploy" section. Every other example has one. Even a skeleton should show the build → upload → portal lifecycle.
- **HW-R3:** Doesn't mention the four log messages a developer should expect to see (`"onRequestHeaders >> Hello World!"`, etc.). A learner running this example needs to know what success looks like.

**Next action:** **needs-rework** before sign-off — README rework (HW-R1/R2/R3) is the higher-value item; HW-C1 is a one-line decision.

### headers

#### 2026-05-13 — comparator pilot (Phase 0 / Task #6)

**Assertions:** ⚠️ — pre-authored `.live.json` was under-spec'd; rewrote to match what `assembly/index.ts` actually demonstrates
**Local Test:** ✅ — 1/1 fixture passes after `.live.json` rewrite
**Code Review:** ⬜ deferred
**README Review:** ⬜ deferred
**Findings:**
- The pre-authored `.live.json` asserted `new-header-03: "value-03"` (single value), but the example deliberately demonstrates multi-value headers by calling `.add("new-header-03", "value-03-a")` immediately after (line 209). Reality is `["value-03", "value-03-a"]`. Rewritten `.live.json` now asserts:
  - `new-header-01: ""` (post-`remove` empty, per FastEdge/nginx semantics)
  - `new-header-02: "new-value-02"` (post-`replace`)
  - `new-header-03: ["value-03", "value-03-a"]` (multi-value teaching point)
  - `new-response-header: "value-02"` (cross-phase: added in request hook, replaced in same hook)
  - Logs: `#header -> host: example.com`, `#header -> new-response-header: value-02`
- Did **not** assert `"onRequestHeaders: OK!"` / `"onResponseHeaders: OK!"` logs — those are `LogLevelValues.debug` and `setLogLevel(LogLevelValues.info)` filters them out (line 71).
- Did **not** assert status/body — synthetic `fastedge-builtin.debug` origin's output is not predictable from source alone.
- Comparator's `expected.headers` semantics tightened in this session: string = any-value-equals; `string[]` = exact ordered array match. Mirrors `@gcoredev/fastedge-test/assertions`.

#### 2026-05-13 — code + README review

**Code Review:** ⚠️ — pass-with-issues (5 findings, one positive cross-reference)
**README Review:** ⚠️ — pass-with-issues (3 findings)

**Findings — Code Review (`assembly/index.ts`):**

- **HE-C1 (Style — duplication):** `onRequestHeaders` (lines 81–178) and `onResponseHeaders` (lines 180–241) duplicate the same add/remove/replace dance, including doubled `expectedHeaders` blocks (151–154 vs 213–217). Duplication may be deliberate (showing same API on both phases) but feels padded. Consider extracting a shared helper, or trimming one phase to remove the redundancy.
- **HE-C2 (Hidden teaching):** Lines 126–146 inside `onRequestHeaders` demonstrate cross-phase header writes — adds `new-response-header` in the *request* phase, then re-reads and replaces it in the same phase. The inline comment at lines 136–137 explicitly notes this is "a common issue in Proxy-Wasm environments where certain operations are only valid during specific phases." Great teaching moment but buried inside the request handler. Surface in the README (see HE-R1).
- **HE-C3 (Correct guard pattern — positive finding):** Lines 130–133 demonstrate the correct `.get().length > 0` guard before `.replace()`. This is the convention `body` violates (B-C1) — direct reference point for **CC-04**.
- **HE-C4 (Pedagogy):** `validateHeaders` uses `Set<string>` of `"name:value"` concatenations as a workaround for AssemblyScript's limited generics. Clever but opaque for learners. A two-line comment explaining the encoding choice would help.
- **HE-C5 (Style):** Unused `a: u32` parameter on hooks. Compare `headers: u32` in `body`. Inconsistent naming convention for unused parameters across the codebase — worth deciding on `_` prefix or descriptive name.

**Findings — README Review:**

- **HE-R1:** No mention of the cross-phase response-header demonstration (HE-C2). The "What it does" only describes same-phase mutations.
- **HE-R2:** No mention of multi-value headers — `add("new-header-03", "value-03-a")` *deliberately* demonstrates multi-value, but the README treats it as "Adds a second value" without explaining why it matters. This is exactly why the pre-authored `.live.json` was wrong (single-value assertion). README should call this out as a teaching point.
- **HE-R3:** No mention of the validation pattern (`validateHeaders` symmetric-diff self-check) as a teaching artifact — the example is doing real-world test-in-production style validation and that's worth highlighting.

**Next action:** **needs-rework** — HE-R1/R2/R3 (README enhancements) plus consider HE-C1 (deduplication decision). HE-C2/C4/C5 are polish.

### body

#### 2026-05-13 — full validation pass

**Assertions:** ✅ — 2/2 `.live.json` siblings authored from `assembly/index.ts` (client.live.json + skip.live.json)
**Local Test:** ✅ — 2/2 fixtures pass on first run
**Code Review:** ⚠️ — pass-with-issues (4 findings, all polish-level)
**README Review:** ⚠️ — pass-with-issues (3 findings, all polish-level)

**`.live.json` design notes:**
- Logs asserted: only `setLogLevel(LogLevelValues.info)`-visible ones (`url=…`, `contentType=…`, `onResponseBody >> bodyStr: …`). The `onRequest/Response{Headers,Body} >>` hook-entry logs are at debug level and filtered out.
- `client.live.json` asserts the redaction transform: `body: "Original message body (36 bytes) redacted.\n"` (36 = UTF-8 byte length of the original `"Hello Client, this is a test message"`).
- `skip.live.json` asserts pass-through: `body: "Hello World, this is a test message"` (unchanged).
- Both rely on the builtin's `x-debugger-content: body-only` mode echoing the (possibly-modified) request body back as the response body. Confirmed in `fastedge-test` runner source.

**Findings — Code Review (`assembly/index.ts`):**

- **B-C1 (Convention mismatch):** Line 81 calls `stream_context.headers.response.replace("transfer-encoding", "Chunked")` without first checking the header exists. The `headers` example demonstrates the correct guard pattern at lines 130–133 (`.get()` length-check before `.replace()`). With the synthetic builtin origin this is a silent no-op. Inconsistent with the SDK's own demonstrated convention; should follow the guard pattern or use `.add()` if the intent is to set unconditionally.
- **B-C2 (Style):** `"Chunked"` capitalization on line 81 — RFC 7230 normalizes `transfer-encoding` values to lowercase. Most CDNs canonicalize. Minor.
- **B-C3 (Pedagogy):** `setLogLevel(info)` on line 21 suppresses the `"onRequestHeaders >>"` / `"onRequestBody >>"` / `"onResponseHeaders >>"` / `"onResponseBody >>"` hook-entry logs (lines 35, 45, 75, 95) — a learner reading source expecting to see them will be confused. Either bump to INFO or annotate in README.
- **B-C4 (Redundant demonstration):** Lines 83–86 store `content-type` into a custom property `response.content_type`, but the runner already auto-calculates this exact property name from the response header. The set is overwriting a calculated value with the same value. Teaches cross-hook state but should have an inline comment explaining the redundancy.

**Findings — README Review:**

- **B-R1:** Step 3 says "sets `transfer-encoding: Chunked`" — but per B-C1 this is a silent no-op against the synthetic origin (no pre-existing header to replace). README implies behavior that doesn't happen.
- **B-R2:** No mention of the cross-hook state pattern (B-C4) as a teaching point — the README mentions the `content-type` capture in passing but doesn't call out that this is the demonstration's purpose.
- **B-R3:** No mention of which logs are visible (debug-suppressed vs info) — pairs with B-C3.

**Next action:** **needs-rework** before sign-off — apply fixes for B-C1 (header guard pattern) + B-R1 (matching README correction). B-C2, B-C3, B-C4, B-R2, B-R3 are minor polish; could be batched.

Possible cross-cutting candidate: **CC-04** — if other examples that use `.replace()` on response headers omit the guard pattern, promote this to a cross-cutting convention enforcement. Watch in upcoming rows.

### variablesAndSecrets

#### 2026-05-13 — full validation pass

**Assertions:** ✅ — 1/1 `.live.json` authored from `assembly/index.ts` + `fixtures/.env`
**Local Test:** ✅ — 1/1 fixture passes on first run; env var + secret values flow through end-to-end
**Code Review:** ⚠️ — pass-with-issues (4 findings; V-C1 is meaningful, others minor)
**README Review:** ⚠️ — pass-with-issues (3 findings; missing local-testing guidance)

**`.live.json` design notes:**
- Asserts the two INFO logs (`USERNAME: cdn-test-user`, `PASSWORD: cdn-test-secret`) — values come from `fixtures/.env` via the runner's dotenv config (`FASTEDGE_VAR_ENV_USERNAME` / `FASTEDGE_VAR_SECRET_PASSWORD`).
- No `x-debugger-content` header → builtin returns its default JSON response with `reqHeaders` echoed. Used `bodyContains` for the two injected headers in the JSON-stringified body (single-quote-escaped substrings).
- `contentType: "application/json"` confirms we're in the default builtin response mode.

**Findings — Code Review (`assembly/index.ts`):**

- **V-C1 (Security antipattern in teaching code):** Line 34 — `log(LogLevelValues.info, "PASSWORD: " + password)` logs the secret value verbatim. Example code is copied; this models a pattern that production code should never use. A redacted log (`"PASSWORD: ***"` or `"PASSWORD length: " + password.length.toString()`) would still demonstrate that retrieval succeeded without exposing the value.
- **V-C2 (Naming):** Class names `VariablesRoot` / `VariablesContext` omit "Secrets" though the example handles both. Inconsistent with the registration id `"variablesAndSecrets"` and the example's stated scope.
- **V-C3 (No empty-value handling):** `getEnv("USERNAME")` / `getSecret("PASSWORD")` returns used unconditionally — if either is unset, the example logs `"USERNAME: "` and injects an empty header. Doesn't model defensive reading. Minor pedagogy gap.
- **V-C4 (Log-level inconsistency):** `setLogLevel(LogLevelValues.debug)` on line 19 — but the example only logs at INFO. Other examples (`body`, `headers`, `logTime`) use INFO. Probably copy-paste residue.

**Findings — README Review:**

- **V-R1 (Security warning missing):** Pairs with V-C1 — README should warn explicitly that logging or forwarding secrets in production is dangerous, even though the example does so for demonstration.
- **V-R2 (Local testing not documented):** README doesn't mention `fixtures/.env`, doesn't say how to test locally with `fastedge-test` / visual debugger, doesn't reference the FASTEDGE_VAR_* naming convention used in the `.env`.
- **V-R3 (Upstream effect not shown):** README says "forward as request headers" but doesn't show what the upstream receives — a sample of `reqHeaders` from the builtin response would close the loop.

**Next action:** **needs-rework** before sign-off — V-C1 + V-R1 (security teaching) and V-R2 (local testing docs) are the meaningful items. V-C2/V-C3/V-C4/V-R3 are polish.

Possible cross-cutting candidate: **CC-05** — secret-logging antipattern. Check upcoming examples that use `getSecret` (likely `apiKey`, `jwt`) for the same pattern.

### logTime

#### 2026-05-13 — comparator pilot (Phase 0 / Task #6)

**Assertions:** ✅ — 1/1 pre-existing `.live.json` accepted as-is
**Local Test:** ✅ — 1/1 fixture passes
**Findings (Local Test):** none

#### 2026-05-13 — code + README review

**Code Review:** ⚠️ — pass-with-issues (3 findings)
**README Review:** ⚠️ — pass-with-issues (3 findings)

**Findings — Code Review (`assembly/index.ts`):**

- **LT-C1 (Style):** No `setLogLevel(...)` call. Same observation as HW-C1 — pick a convention across "starter" examples.
- **LT-C2 (Naming):** `printCurrentDate()` (line 12) is misleading — it doesn't print, it *returns a string*. `getCurrentDateString()` or `formatCurrentTime()` would be accurate.
- **LT-C3 (Scope):** Only two hooks (`onRequestHeaders`, `onResponseHeaders`). If the example is meant to demonstrate "timing and performance logging" per README, adding `onResponseBody` with an elapsed-time computation would close the loop and show real value. Currently the example logs *two timestamps* but doesn't *do anything with them* — feels demonstrative-only rather than useful.

**Findings — README Review:**

- **LT-R1 (Positive):** Good explanation of `getCurrentTime()` and the millisecond return value.
- **LT-R2:** No concrete use case shown. README claims "useful as a starting point for timing and performance logging" but doesn't show *what* you'd compute — elapsed time? Request rate? Log correlation? A worked example ("subtract request timestamp from response timestamp to log handler latency") would close the loop.
- **LT-R3 (Minor):** `toISOString()` produces UTC — worth noting since CDN engineers may want local-time logs for debugging.

**Next action:** **needs-rework** — LT-C2 (rename) and LT-R2 (use-case worked example) are the meaningful items; LT-C1/C3/R3 are polish.

### properties

#### 2026-05-13 — comparator pilot (Phase 0 / Task #6) — blocked on example bug

**Assertions:** — (could not run; wasm traps before any assertion can be evaluated)
**Local Test:** ❌ — wasm `RuntimeError: memory access out of bounds` during `onRequestHeaders`
**Code Review:** ⬜ deferred
**README Review:** ⬜ deferred

**Findings — root cause identified:**

The nested function `handleProperty` inside `Properties#onRequestHeaders` (lines 42–79 of `assembly/index.ts`) is compiled by AssemblyScript as a **first-class function value** stored in the elem table and invoked via `call_indirect`. AS only emits default-parameter initialization at the **call site for direct calls** — for indirect calls it passes `0` in unspecified arg slots and relies on a callee-side prelude to substitute defaults. The generated WAT shows no such prelude in `Properties#onRequestHeaders~handleProperty` (see `build/properties-debug.wat` line 14997+).

The first call `handleProperty(REQUEST_URI, 551, "uri", "request-uri")` passes all 5 args explicitly and works — log line `onRequestHeaders >> uri: http://...` is emitted.

The second call `handleProperty(REQUEST_HOST, 552)` relies on `propertyName: string = ""` and `headerName: string = ""` defaults. WAT at line 16908–16917 shows:

```wat
global.get $assembly/index/REQUEST_HOST   ; propertyKey
i32.const 552                              ; errorCode
i32.const 0                                ; propertyName = NULL (default not applied)
i32.const 0                                ; headerName   = NULL (default not applied)
i32.const 0                                ; allowEmpty
i32.const 2                                ; ~argumentsLength = 2
call_indirect
```

The function body then loads `propertyName` (= 0), calls `String#get:length` which reads the GC `rtSize` header at addr 0 → trap. Crash is reproducible with the release wasm too, and is independent of fastedge-test — would crash identically in production FastEdge.

**Three candidate fixes** (in increasing order of change to the example):

1. **Pass all 5 args explicitly at every call site** (8 call sites need updating; smallest diff; preserves the helper-function-with-defaults idiom but eliminates default reliance)
2. **Promote `handleProperty` to a method on the `Properties` class** *(recommended)* — methods are dispatched directly, not via `call_indirect`, so AS applies defaults correctly. Matches the rest of the example's OO style.
3. **Inline the helper at each call site** — verbose, no AS quirks, but loses the "extract repeated pattern" teaching value.

**Possible cross-cutting implication:** the SDK's `CLAUDE.md` Platform Constraints list (next to "no closures over mutable state") should add a rule like *"avoid default parameters on nested functions in example code — AS lowers them to call_indirect and does not apply defaults"*. Verify the same trap doesn't exist in any other example before drafting the rule.

**Next action:** **blocked** on example fix decision. When we reach this row in systematic order, decide between fix options (1/2/3), apply, rebuild, re-run comparator, then re-author `.live.json` if needed (the current one is itself thin — only asserts the `"onRequestHeaders >> "` log substring).

### abTesting

#### 2026-05-13 — full validation pass

**Assertions:** ✅ — 4/4 `.live.json` siblings authored from `assembly/index.ts` + `fixtures/.env`
**Local Test:** ⚠️ — 3/4 pass; `missing-config` ERRORs due to SDK/runner WASI env init gap (not example bug)
**Code Review:** ⚠️ — pass-with-issues (8 findings; AB-C1 + AB-C2 are meaningful)
**README Review:** ⚠️ — pass-with-issues (3 findings)

**`.live.json` design notes:**
- `existing-cookie-a.live.json` + `existing-cookie-b.live.json`: pin the variant-A and variant-B paths via cookie. Assert log lines (`A/B test "homepage-hero": variant A, path /a/landing`), `X-Variant` + `Set-Cookie` response headers, and the modified `requestUrl` in the builtin JSON response body.
- `new-visitor.live.json`: variant assignment uses `getCurrentTime() % 2` (line 67) → **non-deterministic across runs**. Asserts only invariants: log prefix substrings (`A/B test "homepage-hero": variant ` matches both A and B), the modified URL prefix (`newUrl: http://example.com/`), `x-experiment` and `x-variant` keys in the body JSON (without pinning values). See AB-C2.
- `missing-config.live.json`: should test the 500 misconfigured response. **Blocked** by SDK/runner crash (see AB-S1 below). The `.live.json` is correctly authored against what the example *would* produce; can't be exercised locally until the runner WASI env init is fixed.

**Findings — Code Review (`assembly/index.ts`):**

- **AB-C1 (Debug prefix left in code):** Lines 92-94 — `Farq: -> AbTestingContext -> onRequestHeaders -> newUrl: ${newUrl}` is a developer-handle-prefixed log clearly leftover from local debugging. Should be a clean message.
- **AB-C2 (Non-deterministic variant assignment — design issue):** Line 67 — `now % 2 == 0 ? "A" : "B"` uses `getCurrentTime()` as entropy. Problems: (a) simultaneous requests in the same millisecond get the same variant (not 50/50); (b) same visitor on consecutive requests before cookie persists may flip variants; (c) untestable deterministically. Production A/B testing typically hashes a stable identifier (visitor IP, request fingerprint) for sticky pre-cookie assignment. The README presents this as a real-world pattern but the example is more a "demonstration of cookie persistence" than a "valid A/B testing implementation". Either change the example to use a stable hash (e.g., of `request.x_real_ip`), or be explicit in the README that the entropy source is illustrative.
- **AB-C3 (Inconsistent import path):** Line 18 imports `getCurrentTime` from `@gcoredev/proxy-wasm-sdk-as/assembly/fastedge/utils/runtime` (deep path) while `setLogLevel`/`getEnv` come from `assembly/fastedge` top-level. Likely a missing top-level re-export.
- **AB-C4 (Case-sensitive cookie lookup):** Line 60 — `request.get("Cookie")` capital C. HTTP header names are case-insensitive; relies on SDK normalisation.
- **AB-C5 (No cookie-name sanitization):** Line 59 — `cookieName = "fe_exp_" + experimentName`. If EXPERIMENT_NAME contains RFC 6265-illegal chars, the cookie becomes malformed. Fine for the demo value `homepage-hero`; worth a defensive note for production use.
- **AB-C6 (`Cookie` header lookup of empty string):** Line 134 — `if (cookieHeader === "") return "";` — `stream_context.headers.request.get(name)` returns `""` for absent headers; the check works but reading "empty == absent" is fragile.
- **AB-C7 (Style):** `private getCookieValue` is good encapsulation. No closures or try/catch. AS compliance: clean.
- **AB-C8 (No path normalisation):** Lines 76-77 — `newPath = variantPath + originalPath`. Trailing-slash on variantPath and leading-slash on originalPath would produce `//`. Defensive note.

**Findings — README Review:**

- **AB-R1:** Doesn't caveat the time-based variant assignment (AB-C2) as illustrative — implies this is a production-ready pattern.
- **AB-R2:** Doesn't mention that EXPERIMENT_NAME becomes part of a cookie name with the constraints that implies.
- **AB-R3:** No mention of cache-key interactions — variant-specific paths usually need separate cache keys; CDN config matters and a user copying this example may not realize.

**Findings — SDK/runner gap (new cross-cutting candidate):**

- **AB-S1 (SDK getEnv crashes when WASI env uninitialized):** When `runnerConfig.dotenv` is not enabled, the proxy-wasm runner doesn't initialize a WASI environment table. The SDK's `getEnv` (`assembly/fastedge/dictionary.ts` line 14-20) calls `process.env.has(name)` which trips an AssemblyScript Map traversal over corrupted memory → `RuntimeError: memory access out of bounds`. Production FastEdge always provides an at-least-empty WASI env; fastedge-test should mirror that. Workaround for fixture authors: set `"dotenv": { "enabled": true }` in every `.test.json` even when no `.env` file exists. Promoting to **CC-08** below.

**Next action:** **needs-rework** — AB-C1 (cleanup) and AB-C2 (variant entropy decision) are the meaningful items. `missing-config` row will remain ⚠️ until AB-S1 is resolved upstream.

### apiKey

#### 2026-05-13 — full validation pass

**Assertions:** ✅ — 4/4 `.live.json` siblings authored from `assembly/index.ts` + `fixtures/.env`
**Local Test:** ⚠️ — 3/4 pass; `missing-header` FAILs due to runner gap (CC-09) — not example bug
**Code Review:** ⚠️ — pass-with-issues (6 findings; AK-C1 is a positive cross-reference, AK-C4 is the most meaningful)
**README Review:** ⚠️ — pass-with-issues (3 findings)

**`.live.json` design notes:**
- `happy-path.live.json`: asserts `200`, `application/json`, success log, host echoed in body. Did NOT assert that `X-API-Key` is stripped from the upstream request — would require a `bodyDoesNotContain` assertion the comparator doesn't support. Comparator gap to consider later.
- `invalid-key.live.json`: pins 403, body `"Invalid API key"`, log `"API key validation failed"`.
- `missing-header.live.json`: pins 401, body `"Missing X-API-Key header"`, **asserts `www-authenticate: API-Key`** — currently FAILs because of runner bug CC-09. Assertion is correct as authored (matches example contract); blocked on upstream runner fix.
- `missing-secret.live.json`: pins 500, body `"App misconfigured"`, log `"API_KEY secret not configured"`. **No crash** — confirms `getSecret` (which uses `proxy_get_secret` host call, not `process.env`) is not affected by CC-08.

**Findings — Code Review (`assembly/index.ts`):**

- **AK-C1 (Positive — correct secret handling):** Logs are generic — `"API key validated successfully"`, `"API key validation failed"`, `"API_KEY secret not configured"` (lines 38, 63, 76). None expose the actual secret or the rejected provided key. **This is the correct pattern that `variablesAndSecrets` V-C1 violates.** Direct cross-reference for CC-05.
- **AK-C2 (Style):** `UNAUTHORIZED`/`FORBIDDEN`/`INTERNAL_SERVER_ERROR` `u32` constants at lines 19-21 — clean readability.
- **AK-C3 (Case-sensitivity):** Line 48 — `request.get("X-API-Key")` capital. Same pattern as AB-C4; relies on SDK case-insensitivity.
- **AK-C4 (Security — timing attack mitigation):** Line 62 — `providedKey !== expectedKey` is a non-constant-time compare. Early-exit on mismatch leaks information about character positions. Rarely exploitable in practice (network noise dwarfs the signal) but security-conscious production code uses constant-time compare. AssemblyScript has no built-in helper — would need a small `constantTimeEqual(a, b)` function. Worth a code comment at minimum acknowledging the limitation, or a proper helper if we want this example to be a security-best-practice reference.
- **AK-C5 (Minor):** No early-length-bypass before compare — minor.
- **AK-C6 (`.remove()` semantics ≠ README claim):** Line 74 — `request.remove("X-API-Key")`. README says "strips the X-API-Key header" but per the headers example's known issue, nginx-style `.remove()` sets the value to empty rather than deleting the header entirely. Upstream sees `X-API-Key: ""` not "header absent". README implies full deletion. Either update README or use a different approach if true deletion is required (which may not be possible in the proxy-wasm/nginx model).

**Findings — README Review:**

- **AK-R1:** No security note about timing attacks (AK-C4).
- **AK-R2:** Doesn't mention `.remove()` empty-value semantics (per AK-C6 / headers known issue cross-reference).
- **AK-R3:** Says "simpler alternative to JWT validation" — could link to the `jwt` example for direct comparison.

**Findings — runner gap:**

- **AK-S1 (CC-09 below — runner drops send_http_response headers):** `examples/apiKey/fixtures/missing-header.test.json` exercises `send_http_response(401, "unauthorized", body, [makeHeaderPair("WWW-Authenticate", "API-Key")])`. SDK serializes correctly; runner deserializes correctly; runner then **discards** the headers (`logDebug(\`send_local_response headers (not merged): ...\`)`). `localResponse` stores only `statusCode/statusText/body`. The `(not merged)` log message suggests this is a known runner TODO.

**Next action:** **needs-rework** — AK-C4 (security note/helper) + AK-C6/AK-R2 (remove semantics docs) are the meaningful items. `missing-header` row will stay ⚠️ until CC-09 is fixed in fastedge-test.

### cacheControl

#### 2026-05-13 — full validation pass

**Assertions:** ✅ — 7/7 `.live.json` siblings authored from `assembly/index.ts` + `fixtures/.env`
**Local Test:** ✅* — 7/7 fixtures pass; **asterisk because pass depends on runner upsert semantics that may not match production** (CC-C1)
**Code Review:** ⚠️ — pass-with-issues (4 findings; CC-C1 is critical)
**README Review:** ⚠️ — pass-with-issues (2 findings; CC-R1 positive)

**`.live.json` design notes:**
- 6 happy-path fixtures cover content-type routing (text/html → public+revalidate, image/png + application/javascript → immutable, application/json + application/xml → no-cache when API_MAX_AGE=0, text/csv → default 600s).
- `error-status.test.json` uses `x-debugger-status: 500` to force a 5xx; example sets `Cache-Control: no-store` via the early-return path (lines 39-42).
- All 7 PASS — including `cache-control` and `vary` header assertions.

**CRITICAL local-vs-production parity concern (CC-C1):**

The example uses `stream_context.headers.response.replace("Cache-Control", ...)` (lines 39, 78) without a `.get().length > 0` guard. Reading the fastedge-test runner source (`dist/lib/index.js` lines 1108-1119):

```js
proxy_replace_header_map_value: (mapType, keyPtr, keyLen, valuePtr, valueLen) => {
  const tuples = this.getInternalHeaders(mapType);
  const filtered = tuples.filter(([k]) => k !== key);
  filtered.push([key, value]);  // adds even if not pre-existing
  this.setInternalHeaders(mapType, filtered);
}
```

The runner's `.replace()` is **upsert** (filter-out then push). But the `headers` example's source comment at line 130 explicitly says *"cannot replace a header that does not exist"*, implying production FastEdge has a different (stricter) semantics where `.replace()` is a no-op on absent headers.

The builtin response generator (also in fastedge-test) sets only `content-type` and `content-length` — no Cache-Control. So if production FastEdge follows the headers-example comment, **cacheControl silently fails to set Cache-Control on any upstream response that doesn't already have one** (i.e., most responses). This is a deployment-time bug that would never surface in local validation.

**Two interpretations, both reasonable:**
1. **Production = upsert (matches runner):** headers example's comment is outdated/wrong; `body` B-C1 isn't really a bug; cacheControl is correct as-written.
2. **Production = strict replace (matches headers comment):** cacheControl needs every `.replace()` wrapped in a `.get().length > 0` check OR switched to `.add()`; `body` B-C1 is real; CC-04 elevated to "must fix everywhere".

**Resolution needed:** verify on live edge before merge. This is the highest-priority blocker for the whole branch. Tracks under updated CC-04.

**Findings — Code Review (`assembly/index.ts`):**

- **CC-C1 (CRITICAL — production parity):** see above. All `.replace()` calls assume upsert behavior. Cannot ship without verifying production semantics. See updated CC-04.
- **CC-C2 (Status decoding fragility):** Lines 30-35 decode `response.status` as big-endian u16 from an ArrayBuffer (`(bytes[0] << 8) | bytes[1]`). Works against the fastedge-test runner because the runner encodes status that way; proxy-wasm spec doesn't mandate this encoding (could equally be ASCII digit bytes for `"200"`). Worth a comment explaining the assumption.
- **CC-C5 (Vary uses .add, not .replace):** Lines 61, 72 — `stream_context.headers.response.add("Vary", ...)`. If upstream already set Vary, this produces a multi-value Vary header (RFC-valid). Subtle implication for caching keys. Worth a comment.
- **CC-C9 (CC-11 latent bug — fallback masked):** Lines 49-51 — `getEnv("STATIC_MAX_AGE") || "31536000"` etc. Per CC-11 (revised), AS `||` on empty strings returns the empty string, NOT the fallback. The fixture `.env` has all three keys set to non-empty values, masking the bug. If a user deploys with an env var explicitly set to empty (e.g., `STATIC_MAX_AGE=`), the example would produce `cache-control: public, max-age=` (invalid header) instead of the documented default. Fix same as GR-C1: `const staticMaxAge = getEnv("STATIC_MAX_AGE") === "" ? "31536000" : getEnv("STATIC_MAX_AGE");` or a small helper.
- **CC-C8 (Case-sensitive header lookup):** Line 47 — `response.get("Content-Type")`. Same pattern as AB-C4, AK-C3.

**Findings — README Review:**

- **CC-R1 (Positive):** Best-structured README so far. Clear cache-policy table, configuration table with defaults, complete deploy instructions. Reference candidate for **CC-07** template.
- **CC-R2:** Doesn't acknowledge the `.replace()` semantics question. A user copying this example may not realize behavior depends on origin already setting Cache-Control. Pair with CC-C1.

**Next action:** **BLOCKED ON CC-04 RESOLUTION.** Once production `.replace()` semantics are confirmed, decide between (a) accept as-is + fix headers-example comment, or (b) guard every `.replace()` call (broader rework affecting body and cacheControl).

### cors

#### 2026-05-13 — full validation pass

**Assertions:** ✅ — 4/4 `.live.json` siblings authored (3 main + wildcard variant) from `assembly/index.ts` + `fixtures/.env` + `fixtures/wildcard/.env`
**Local Test:** ✅ — 4/4 fixtures pass on first run
**Code Review:** ⚠️ — pass-with-issues (6 findings; CO-C1 is the second confirmed instance of the Farq debug prefix → CC-10)
**README Review:** ⚠️ — pass-with-issues (3 findings; CO-R1 positive)

**`.live.json` design notes:**
- `happy-path.live.json`: Origin allowed, asserts `access-control-allow-origin`, `vary: Origin`, `access-control-expose-headers`.
- `disallowed-origin.live.json`: Origin not in allow list, asserts the rejection log + that no CORS headers were added (implied by not asserting them; comparator doesn't have negate-header assertion).
- `no-origin.live.json`: No Origin header → early-return; asserts the log substring `"...origin: "` (with trailing space).
- `wildcard-origins.live.json`: `ALLOWED_ORIGINS=*` from `wildcard/.env`. Confirmed comparator's relative-path dotenv resolution works (`"path": "wildcard/"` resolves to `examples/cors/fixtures/wildcard/`).
- No `.replace()` calls in this example — uses `.add()` for all response header writes. **Not affected by CC-04.**

**Findings — Code Review (`assembly/index.ts`):**

- **CO-C1 (CC-10 — second `Farq:` debug prefix):** Line 33 — `Farq: -> CorsContext -> onRequestHeaders -> origin: ${origin}`. Identical pattern to AB-C1. Two confirmed instances of the same developer-handle leftover across examples → promoted to **CC-10** for batch cleanup.
- **CO-C2 (Duplicated allow-list logic):** Lines 41-54 (`onRequestHeaders`) and lines 71-83 (`onResponseHeaders`) duplicate the same split-trim-iterate origin check. The request-side check is dead — it only logs and continues; only response-side decides whether to add CORS headers. Either drop the request-side check entirely, or extract `private isOriginAllowed(origin: string, allowedOrigins: string): boolean`.
- **CO-C4 (Case-sensitive header lookup):** Line 30 — `request.get("Origin")` capital O. Same pattern as AB-C4, AK-C3, CC-C8.
- **CO-C5 (Incomplete CORS scope):** Only handles `Access-Control-Allow-Origin` and `Access-Control-Expose-Headers`. Production CORS responses also need `Access-Control-Allow-Methods`, `Access-Control-Allow-Credentials`, `Access-Control-Max-Age` (the README says preflights are at the edge, but those headers also appear on actual responses — Allow-Credentials especially). Worth either expanding the example or explicitly scoping it as "minimal subset" in README.
- **CO-C7 (No origin normalization):** Exact-string match against the env list. RFC 6454 origins are `scheme://host:port`; trailing slashes, default ports, case differences could all cause spurious mismatches. Production-grade CORS does URL normalization.
- **CO-C9 (Asymmetric logging):** Lines 51 logs "origin not allowed" but the allowed path (lines 85-99) has no log. Inconsistent observability — either log both paths or neither.

**Findings — README Review:**

- **CO-R1 (Positive):** OPTIONS preflight callout is excellent — uses a `> **Note:**` block to explain where preflights are handled and why the wasm doesn't see them. Best-in-class pattern for surfacing SDK-specific gotchas. Reference for **CC-07** template.
- **CO-R3 (CORS scope):** Doesn't say what CORS subset this covers vs. production setups. A user copying this may expect a turnkey CORS implementation and miss Allow-Methods/Allow-Credentials.
- **CO-R5 (`*` + credentials caveat):** When Access-Control-Allow-Origin is `*`, credentials cannot be set (CORS spec). README doesn't mention this when describing wildcard.

**Next action:** **needs-rework** — CO-C1 (Farq cleanup) and CO-C2 (dedup) are the high-value items. The README is mostly good; CO-R3/R5 are useful additions but minor.

### customErrorPages

#### 2026-05-13 — full validation pass

**Assertions:** ✅ — 6/6 `.live.json` siblings authored from `assembly/index.ts`
**Local Test:** ✅* — 6/6 fixtures pass; **asterisk: 5/6 rows assert `transfer-encoding: Chunked` which depends on the same runner-upsert semantics as cacheControl** (CC-04). Content-Type assertions are CC-04-neutral because the builtin does pre-set Content-Type.
**Code Review:** ⚠️ — pass-with-issues (6 findings; CEP-C1 is the CC-04 instance, CEP-C4/C10 are positive)
**README Review:** ⚠️ — pass-with-issues (3 findings; CEP-R1 positive)

**`.live.json` design notes:**
- `200-passthrough.test.json`: builtin returns 200 + default JSON; example skips (code < 400). Asserts pass-through.
- 4xx/5xx fixtures all use `x-debugger-status: <code>` + `x-debugger-content: status-only` to get the builtin to produce an empty-bodied error response that the example then replaces with custom HTML. Asserts HTML body fragments (5 substrings each: title tag, code element, h1, description, category), `text/html` content-type, the success log.
- `418-fallback.live.json` exercises the default-case branches in `getErrorTitle` / `getErrorDescription` (since 418 isn't in either lookup table → returns "Error" / generic description).
- Did NOT use `expected.body` (exact HTML match) — too brittle; HTML strings are long and styling-dependent. `bodyContains` for the meaningful semantic fragments is better.

**Findings — Code Review (`assembly/index.ts`):**

- **CEP-C1 (CC-04 instance):** Line 41 — `replace("Transfer-Encoding", "Chunked")` without guard. Builtin response doesn't pre-set Transfer-Encoding (only `content-type` + `content-length`). Locally PASSes only because the runner upserts. **Same production-parity risk as B-C1 and CC-C1.** Data point #3 for CC-04 across the codebase. Note: `replace("Content-Type", "text/html")` on line 39 IS safe — builtin does pre-set Content-Type for status-only mode.
- **CEP-C2 (Status decoding fragility — duplicate of CC-C2):** Lines 30-36 and 54-60 use the same big-endian u16 ArrayBuffer decode for `response.status` as cacheControl. Candidate for extraction into a shared SDK helper (`getResponseStatusCode(): u32`).
- **CEP-C3 (Acceptable duplication):** Status check duplicated across `onResponseHeaders` (lines 29-44) and `onResponseBody` (lines 49-67). The example's own comment at line 53 acknowledges: "Read response status from property (no instance state between hooks)". Correct workaround for the proxy-wasm/nginx hop model documented in the abTesting example (line 111-112). Reasonable.
- **CEP-C4 (Positive — no XSS risk):** Lines 73-103 build HTML by concatenation, but the inserted values (`title`, `description`, `category`, `code.toString()`) all come from static lookup tables — no user input. Clean.
- **CEP-C5:** Line 39 — `replace("Content-Type", "text/html")` has no charset. The HTML body declares `<meta charset="utf-8">` but the response header should also declare it for proper rendering of non-ASCII chars. Minor — affects edge cases only.
- **CEP-C6:** Line 41 — `"Chunked"` capitalization. Same nit as body B-C2.
- **CEP-C10 (Positive — pedagogy):** Comment at lines 106-108 explains the `body_buffer_length` vs `body.byteLength` distinction for `set_buffer_bytes`. Without this comment, a learner would likely write `body.byteLength` and leave tail bytes of the original response. Reference for example-code commenting standard.

**Findings — README Review:**

- **CEP-R1 (Positive):** Explicit list of covered codes (400, 401, 403, 404, 405, 408, 429, 500, 502, 503, 504) — concrete coverage statement.
- **CEP-R2:** Doesn't mention which response headers the example modifies (Content-Type, Content-Length removal, Transfer-Encoding).
- **CEP-R3:** No HTML output preview — copy-paste users would want to see what the rendered page looks like.
- **CEP-R4:** No charset note (pairs with CEP-C5).

**Next action:** **BLOCKED ON CC-04 RESOLUTION** for the Transfer-Encoding portion (rest is clean). CEP-C1 is the CC-04 item; CEP-C2 could feed a separate SDK helper proposal. CEP-C5/C6 minor.

### geoBlock

#### 2026-05-13 — full validation pass

**Assertions:** ✅ — 3/3 `.live.json` siblings authored from `assembly/index.ts` + `fixtures/.env`
**Local Test:** ⚠️ — 2/3 pass; `missing-config` ERROR (2nd confirmed CC-08 instance — runner WASI env gap)
**Code Review:** ⚠️ — pass-with-issues (8 findings; GB-C1 dead-code + GB-C3 observability gap are meaningful)
**README Review:** ⚠️ — pass-with-issues (3 findings; GB-R1 positive ISO link)

**`.live.json` design notes:**
- `allowed-country.live.json` (DE): asserts 200 + JSON pass-through (default builtin response since no `x-debugger-content`).
- `blocked-country.live.json` (CN): asserts 403 + `body: "Request blacklisted"`. `send_http_response` called with empty additional_headers → CC-09 not triggered.
- `missing-config.live.json`: should assert 500 + `"App misconfigured"`. **Blocked by CC-08** — getEnv crashes before example reaches its own error-handling.
- This example has **no `log()` calls** anywhere → no log assertions possible (which is itself a finding — GB-C3).

**Findings — Code Review (`assembly/index.ts`):**

- **GB-C1 (Dead code):** Line 23 — `allow: bool = true;` class field is declared but never read or written. Should be removed.
- **GB-C2 (CC-06):** No `setLogLevel(...)` call. Moot in practice (no `log()` calls), but inconsistent with the cross-cutting convention.
- **GB-C3 (Observability gap — meaningful):** No logging on block/allow decisions or misconfig. For security-relevant decisions (geo-blocking), every blocked request should be logged for auditability. Production deployments need to answer "why was this request blocked?". Compare with apiKey (logs every validation outcome). Add: `log(info, "Geo-block: " + countryStr + " denied")` on the block path, and ideally an allowed-path log too.
- **GB-C4 (CC-08, 2nd confirmed instance):** Line 30 — `getEnv("BLACKLIST")` is the first action. Crashes with `RuntimeError: memory access out of bounds` in `wasi_process.ts(91:12)` → `Map.has` → `getEnv` when WASI env is uninitialized. Identical trace to abTesting AB-S1. The example's own `if (!blacklist) { send 500 }` error path is unreachable in local validation.
- **GB-C5 (Dead-code check):** Lines 45-53 check `blacklistedCountries.length === 0` after splitting on `,`. But `"".split(",")` returns `[""]` (length 1), and the empty-blacklist case is already filtered by `if (!blacklist)` on line 31. This branch is unreachable.
- **GB-C7 (Case-sensitive country compare):** Line 67 — `blacklistedCountries.includes(countryStr)` is exact-match. Works because `request.country` from FastEdge Geo-IP is uppercase ISO codes, but env-side values could be mixed-case (user error). Should normalize via `.toLowerCase()` or `.toUpperCase()` on both sides.
- **GB-C9 (Status code choice):** Line 58 — uses `BAD_GATEWAY` (502) when country info is missing. 502 means "upstream returned bad data". For "geo data unavailable" a 503 (Service Unavailable) is more semantically correct.
- **GB-C10 (Registration id casing):** Line 82 — `registerRootContext(..., "geoblock")`. Other examples use camelCase IDs (`"abTesting"`, `"customErrorPages"`, `"cacheControl"`). Should be `"geoBlock"`.

**Findings — README Review:**

- **GB-R1 (Positive):** Direct link to ISO 3166-1 alpha-2 spec — useful external reference.
- **GB-R2:** No note on case-sensitivity of country code comparison (pairs with GB-C7).
- **GB-R3:** Doesn't explain that `request.country` is populated by FastEdge's Geo-IP layer — should be explicit.
- **GB-R4:** No mention of logging (pairs with GB-C3) — observability matters for security features.

**Next action:** **needs-rework** — GB-C1 (remove dead field), GB-C3 (add audit logs), GB-C10 (registration id casing) are the actionable items. GB-C5/C7/C9 are polish. `missing-config` stays ⚠️ until CC-08 is fixed.

### geoRedirect

#### 2026-05-13 — full validation pass

**Assertions:** ✅ — 2/2 `.live.json` siblings authored from `assembly/index.ts` + `fixtures/.env` + README contract
**Local Test:** ❌ — 1/2 PASS, 1 FAIL — `default.test.json` fails because the example's README-documented "fallback to DEFAULT" behavior is **broken in the source code** (GR-C1, AS truthy bug)
**Code Review:** ❌ — has real bugs (GR-C1 + GR-C2 confirmed). Not just polish.
**README Review:** ⚠️ — pass-with-issues (README documents broken behavior; needs sync with reality, see GR-R2)

**`.live.json` design notes:**
- `germany.live.json` (DE in env): asserts `requestUrl: "https://de-origin.example.com/test"` echoed in default builtin JSON response. PASSes.
- `default.live.json` (FR, not in env): asserts the README-documented fallback `requestUrl: "https://default-origin.example.com/test"`. **FAILs** — example produces `requestUrl: "/test"` (origin empty). This is the example failing to meet its README contract, which is exactly what the tracker should catch.
- No log assertions possible — example logs only at DEBUG, but `setLogLevel(info)` filters them out (GR-C3).

**Findings — Code Review (`assembly/index.ts`):**

- **GR-C1 (CRITICAL — AS truthy/falsy bug, fallback broken):** Line 88 — `const origin = countrySpecificOrigin || defaultOrigin;`. AssemblyScript treats empty strings as **truthy** (per AS docs: *"empty strings are not considered false in boolean conversion"*). So when `countrySpecificOrigin = ""` (env var not set for the country), `||` short-circuits, returns `""`, and never falls back to `defaultOrigin`. **The example's stated fallback behavior is BROKEN.** Empirically confirmed: `default.test.json` (country=FR, not in env) produces `requestUrl: "/test"` instead of `"https://default-origin.example.com/test"`.
  Fix: `const origin = countrySpecificOrigin === "" ? defaultOrigin : countrySpecificOrigin;`
- **GR-C2 (REVISED — NOT a bug):** Originally flagged `if (!defaultOrigin)` as broken. WAT inspection of jwt revealed AS's `!str` calls `String.__not` which handles empty strings correctly. **GR-C2 retracted.** See CC-11 revision.
- **GR-C3 (Pedagogy gap — log levels):** Lines 35, 62, 72, 94 — all `log()` calls at `LogLevelValues.debug`. Line 24 sets `LogLevelValues.info` which filters debug out. **Zero logs visible at runtime.** Same issue as body B-C3.
- **GR-C4 (CC-08 risk):** Line 37 calls `getEnv("DEFAULT")` first. Would crash if WASI env uninitialized. Not observed because both fixtures enable dotenv.
- **GR-C5 (Registration id casing):** Line 104 — `"georedirect"` lowercase. Same as GB-C10. Should be `"geoRedirect"`.
- **GR-C6 (Redundant Host replace):** Lines 69-74 — reads `request.host` property, then replaces the request `Host` header with the same value. No-op or vestigial. The likely intent was "set Host to match the new origin's domain after URL rewrite", but the code reads the OLD host.
- **GR-C7 (No origin URL validation):** No check that DEFAULT or country values are well-formed URLs. Malformed env values could produce broken upstream URLs.
- **GR-C8 (Status code choice):** Line 52 — uses `BAD_GATEWAY` (502) for missing country info. 502 means "upstream returned bad data". Same odd choice as GB-C9.
- **GR-C9 (Fixture inconsistency):** `default.test.json` has an extra `"log": { "level": "info" }` field not in `germany.test.json`. Both also have `logLevel: 2`. The extra field is unrecognized by the schema and ignored by both the runner and my comparator. Pure noise — should be removed for consistency.

**Findings — README Review:**

- **GR-R1 (Positive):** ISO 3166 link.
- **GR-R2 (CRITICAL):** README explicitly documents *"Otherwise it falls back to the DEFAULT origin"* — but per GR-C1 this is broken. Either fix the example to actually fall back, or fix README to say "country-specific override is mandatory; no fallback". As written, README is a contract the example doesn't honor.
- **GR-R3:** Doesn't clarify the mechanism is `set_property("request.url")` to route the upstream call — NOT an HTTP 302 with Location header. Users seeing "redirect" in the title may expect 3xx behavior.
- **GR-R4:** No mention of logging (pairs with GR-C3 — would be moot anyway since debug logs are filtered).

**Next action:** **BLOCKED on bug fix.** GR-C1 + GR-C2 are real bugs, not polish. The example does not behave as its README documents. Needs source fix before re-run.

Promoted AS truthy/falsy semantics to **CC-11**.

### httpCall

#### 2026-05-13 — full validation pass

**Assertions:** ✅ — 1/1 `.live.json` authored from `assembly/index.ts` + README contract
**Local Test:** ✅ — 5/5 PASS after bumping the example's timeout from 1000ms → 3000ms (see HC-C1 resolution below). Originally **2 PASS / 1 FAIL across 3 runs** at 1000ms due to httpbin.org latency (~700ms) leaving no jitter margin.
**Code Review:** ⚠️ — pass-with-issues (8 findings; HC-C1 flaky-timeout is the meaningful item, HC-C5/C6 positive)
**README Review:** ⚠️ — pass-with-issues (2 findings; **HC-R1/R2 are best-in-class** technical explanations)

**Key technical surface (first in the codebase):**

- Uses `proxy_http_call` to dispatch an outbound HTTP request from the WASM hook.
- The fastedge-test runner **does** implement proxy_http_call: it makes a real Node `fetch()` to the upstream and invokes `proxy_on_http_call_response` with the result. Confirmed by reading `@gcoredev/fastedge-test@0.2.1` `dist/lib/index.js` lines 2450-2510.
- The example uses the FastEdge resume model: `onRequestHeaders` returns `StopIteration`, the runtime fetches the response and invokes the callback, then **re-invokes the same `onRequestHeaders`** — the `httpCallDispatched` boolean latches against re-dispatch. Note: this differs from canonical proxy-wasm (no `continueRequest()` needed in FastEdge).

**`.live.json` design notes:**
- Asserts the success-path log sequence: dispatch log → pause log → response-body log (with prefix `"Response body ("` + substring `"\"origin\":"` from httpbin's JSON) → resume log.
- Status 200 / content-type application/json from default builtin response.
- Does NOT pin the body — httpbin's `{"origin":"x.x.x.x"}` contains a non-deterministic IP.

**Findings — Code Review (`assembly/index.ts`):**

- **HC-C1 ✅ RESOLVED (timeout bumped):** Line 94 was `1000` (ms) — empirically too tight against httpbin.org (DNS + TLS + RTT ≈ 700ms, no margin for jitter, 33% failure rate). **Bumped to `3000` with an inline comment** explaining the choice (cold-DNS + jitter margin). 5/5 PASS after rebuild. Comment also nudges users to "tune per upstream in production" so the default doesn't silently become production policy.
- **HC-C2 (External dependency):** Hardcoded `httpbin.org`. Examples should ideally use mockable endpoints; production would be config-driven.
- **HC-C3 (Class latch state — design note):** Line 62 — `httpCallDispatched: bool = false`. Uses instance state across the SDK's "re-invoke onRequestHeaders" cycle. Lines 69-71 explicitly cite SDK docs for this pattern. Different from abTesting's "instance state doesn't survive nginx hop" (which is true across hops) — here we're within a single hop, just re-entered. Trust the comment.
- **HC-C5 (Positive):** Line 28-31 — checks `hdrs == 0` for HTTP call failure and logs at ERROR. Correct defensive pattern.
- **HC-C6 (Positive — log levels):** All logs INFO/ERROR, no `>>` debug pattern. setLogLevel(info) makes everything visible. Pedagogically clean — contrast with body B-C3 and geoRedirect GR-C3.
- **HC-C7 (Minor):** No log line right before the fetch attempt with the target URL — would aid debuggability.
- **HC-C8 (Helper placement):** `handleHttpCallResponse` is top-level function (lines 22-52), not class method. Required by the SDK callback signature (`httpCall(..., callback)` takes a function reference). Worth a code comment explaining the placement.

**Findings — README Review:**

- **HC-R1 (Positive — best-in-class):** "Key concepts" section is the strongest technical explanation in the entire codebase so far. Covers `httpCall()` signature, FastEdge resume model, `stream_context.headers.http_callback` accessor, and `get_buffer_bytes` for response body. **Reference for CC-07 template.**
- **HC-R2 (Positive — critical porting note):** Explicitly states `continueRequest()` is not required in FastEdge (differs from canonical proxy-wasm). Essential for anyone porting from other runtimes.
- **HC-R3:** Doesn't mention the 1000ms timeout choice or its implications (pairs with HC-C1).
- **HC-R4:** httpbin.org isn't called out as illustrative — users may not realize they need to swap for their own upstream URL.

**Next action:** code-review and README review remain ⚠️ (HC-C2/C3/C7/C8 polish; HC-R3/R4 minor). HC-C1 is the only meaningful blocker and is **resolved**. Row could move toward sign-off after the remaining polish items.

### jwt

#### 2026-05-13 — full validation pass (fixtures authored from scratch)

**Assertions:** ✅ — 5 `.test.json` + 5 `.live.json` authored from `assembly/index.ts` + README's provided test tokens. Created `fixtures/.env` with the README's documented test secret.
**Local Test:** ✅ — 5/5 fixtures pass on first run
**Code Review:** ⚠️ — pass-with-issues (5 findings; JT-C1 dead field, JT-C2 naming inconsistency, JT-C3 redundant check)
**README Review:** ⚠️ — pass-with-issues (3 findings; JT-R1 positive — test tokens provided)

**`.live.json` design notes:**
- 5 scenarios: `happy-path` (valid token → 200), `expired-token` (→ 403 "Expired"), `invalid-token` (garbage → 403 "Invalid"), `no-auth-header` (→ 401), `missing-secret` (no dotenv → 500 misconfigured).
- Used the README's pre-baked test tokens and signing secret verbatim — saves figuring out HMAC-SHA256 signing in the fixture.
- `missing-secret` confirms `proxy_get_secret` returns NotFound cleanly when no secret store is initialized (different from `getEnv` which crashes per CC-08).

**Findings — Code Review (`assembly/index.ts`):**

- **JT-C1 (Dead code):** Line 31 — `allow: bool = false;` class field is never read or written. Same pattern as geoBlock GB-C1.
- **JT-C2 (Naming inconsistency):** Line 38 — `getSecret("secret")` lowercase. apiKey uses `getSecret("API_KEY")` UPPERCASE. The `.env` convention preserves case (`FASTEDGE_VAR_SECRET_secret` works), but the inconsistency is jarring across examples. Standardize on UPPERCASE secret names.
- **JT-C3 (Redundant check):** Lines 50-58 check `!authHeader` and lines 60-68 check `authHeader.length == 0`. Per CC-11 (revised), `!str` calls `String.__not` which already handles empty strings. The two checks return identical errors. **One is redundant** — keep only `if (authHeader.length == 0)` or `if (!authHeader)` (the latter is more idiomatic).
- **JT-C4 (Bearer extraction via `.replace`):** Line 70 — `authHeader.replace("Bearer ", "")`. If header is "Bearer xxx" → "xxx" ✓. If "Token xxx" → "Token xxx" (no Bearer to replace) → jwtVerify fails with "Invalid token". Should explicitly check for `Bearer ` prefix with `startsWith()` and reject otherwise — current behavior accepts non-Bearer schemes and gives a confusing "Invalid token" error.
- **JT-C5 (Positive — CC-05 compliance):** Logs (lines 85, 93) are generic — `"Token Expired"`, `"Bad Token"`. No token value leakage. Correct pattern matching apiKey AK-C1.
- **JT-C6 (`as-jwt` dependency):** Imports from `@gcoredev/as-jwt`. External SDK module that needs to be installed. README mentions it; build worked, so install is set up.

**Findings — README Review:**

- **JT-R1 (Positive):** Provides ready-to-use test tokens (valid + expired) AND the signing secret. Best onboarding pattern in the codebase — anyone running this example can immediately test all paths without computing HMAC signatures themselves.
- **JT-R2:** Doesn't mention the secret naming convention (`getSecret("secret")` lowercase vs `getSecret("API_KEY")` uppercase elsewhere) — users will be confused about case-sensitivity rules. Pairs with JT-C2.
- **JT-R3:** Doesn't show example expected logs ("Token Expired", "Bad Token").
- **JT-R4:** Could mention scheme handling — what happens if `Authorization: Basic xxx` is sent (JT-C4)?

**Next action:** **needs-rework** — JT-C1 (remove dead field), JT-C2 (rename to UPPERCASE), JT-C3 (drop redundant check), JT-C4 (proper Bearer scheme parsing). All small, surgical fixes.

### kvStore

#### 2026-05-13 — skipped for local validation (CC-12 runner gap)

**Decision:** The fastedge-test runner does not implement the FastEdge KV store host calls. All KV API operations will fail in the runner, so this example **cannot be locally validated** — it must be tested via the live harness (Phase 2 of the validation flow).

**Status:**
- **Local Test:** 🚫 blocked by CC-12 (runner gap). Not authoring `.test.json`/`.live.json` for the local comparator since we can't verify them.
- **Code Review / README Review:** ⬜ deferred — could be done independently of running the example. Defer until we're ready to write live-test fixtures and have a complete picture.
- **Live Candidate:** ✓ required — this example is the only KV demonstration; Phase 2 selection must include it.

**Next action:** revisit when we begin Phase 2. Author `.test.json` + `.live.json` siblings (the same single source of truth used by the local comparator and `gcore-fastedge:live-test`) at that time, and validate exclusively against the live edge.

Promoted to **CC-12** below.

### largeDictionary

#### 2026-05-13 — full validation pass

**Assertions:** ✅ — 2/2 `.live.json` siblings authored from `assembly/index.ts` + `fixtures/.env`. Computed exact byte length of the test config (109 bytes) via `wc -c` to pin the log assertion.
**Local Test:** ✅ — 2/2 fixtures pass on first run, **including `missing-config` without dotenv**
**Code Review:** ⚠️ — pass-with-issues (1 minor finding; LD-C1/C2/C3 positive — cleanest example reviewed)
**README Review:** ⚠️ — pass-with-issues (3 minor findings; **LD-R1 positive — best technical-guidance table in the codebase**)

**Key technical observation — `getDictionary` is CC-08-immune:**

The example's `missing-config.test.json` has NO dotenv, yet `getDictionary("LARGE_CONFIG")` returns `""` cleanly without crashing. Contrast with `getEnv` which crashes (CC-08) under the same condition. The reason: `getDictionary` uses `proxy_dictionary_get` (a proxy-wasm host call that the runner properly initializes), while `getEnv` uses `process.env.has()` (WASI shim that requires dotenv-driven initialization). Confirmed in fastedge-test runner source: `proxy_dictionary_get` is implemented at `dist/lib/index.js` lines 813-836 with proper NotFound semantics.

This makes `getDictionary` not just a "use for >64KB values" alternative but also a more **robust** API surface — it gracefully handles uninitialized state where `getEnv` traps.

**`.live.json` design notes:**
- `happy-path.live.json`: asserts log `"LARGE_CONFIG size: 109 bytes"` (exact byte count) + bodyContains `"x-config-size":"109"` (header echoed in builtin's JSON response).
- `missing-config.live.json`: asserts log `"LARGE_CONFIG size: 0 bytes"` + bodyContains `"x-config-size":"0"`. Tests the empty-dict case.

**Findings — Code Review (`assembly/index.ts`):**

- **LD-C1 (Positive):** Simple, focused, 45 lines. Single concept demonstrated cleanly. **Reference for "minimal example" template.**
- **LD-C2 (Positive — clean empty handling):** Line 33 — `config.length` on `""` is `0`. No crash on missing config. **Cleanest unconfigured-input behavior in any reviewed example.**
- **LD-C3 (Positive — info logging visible):** Logs at INFO, visible at runtime. No `>>` debug pattern that gets silently filtered out.
- **LD-C5 (Minor):** No distinction between "key missing" and "key set to empty" — both produce size 0. Production code might want a `log(warn, ...)` when LARGE_CONFIG is unconfigured. Style choice.
- **AS / cross-cutting compliance:** Clean against every cross-cutting finding — no `||` patterns (CC-11), no `.replace()` on response headers (CC-04), no secrets (CC-05), no `send_http_response` with headers (CC-09), no `"Farq:"` debug prefix (CC-10). `setLogLevel(info)` set (CC-06). **First example to pass all cross-cutting hygiene checks.**

**Findings — README Review:**

- **LD-R1 (Positive — best technical-guidance table in the codebase):** The "When to use `getDictionary` vs `getEnv`" table with the 64KB rule is concrete, decision-driving, and clearly motivated. **Reference for CC-07 template** — this is the gold standard for "when to use which API" tables.
- **LD-R2:** Doesn't show example log output / expected header value.
- **LD-R3:** Doesn't note that the example handles missing-config gracefully (treats it as size 0). A reader might assume defensive coding is needed.
- **LD-R4:** Mentions "large JSON configs, PEM certificates, policy documents" as use cases but doesn't include a concrete sample for any.

**Next action:** **could sign off after minor polish** — LD-C5 is opinion-level; LD-R2/R3/R4 are nice-to-haves. This is the cleanest row in the validation grid so far. Mark candidate for sign-off once CC-07 README template lands.

---

## Cross-Cutting Findings

Issues that span multiple examples (naming inconsistencies, shared README gaps, SDK API confusion, etc.) go here so we don't repeat the same fix in multiple example sections.

### CC-01 — Pre-authored `.live.json` files are not verified (2026-05-13)

When the tracker was created, 4 examples (helloWorld, headers, logTime, properties) were marked with `1/1` `.live.json` coverage on the assumption their pre-authored siblings were correct. The pilot run showed otherwise: **headers** was under-spec'd (single-value assertion for a deliberately multi-value header), and **properties** never gets far enough to assert anything (wasm trap, see properties section). Implication: treat the `.live.json coverage` column as *claimed* coverage, not *verified*. A row's Local Test column being `✅` is the only signal that its `.live.json` is actually right.

### CC-02 — Potential SDK platform constraint: nested functions with default params (2026-05-13)

The properties example (see its section) hit a real AssemblyScript compilation quirk where nested functions promoted to `call_indirect` do not have default parameters applied. This is **not** an SDK or runner bug — it would crash identically in production FastEdge. If the pattern is found in other examples once we reach them, this should likely become a new bullet under "Platform Constraints" in `CLAUDE.md` (next to "no closures over mutable state"). Track here: examples touched so far that use nested helper functions with defaults — `properties` only. Watch for the same pattern in upcoming rows.

### CC-03 — Comparator harness location (2026-05-13)

Built at `fastedge-coordinator/tools/fixture-validator/` rather than inside `proxy-wasm-sdk-as`. Reasoning: cross-SDK reusability (Rust CDN apps emit the same proxy-wasm wasm format and can be validated with the same JSON-driven harness). If usefulness is demonstrated across this validation pass, candidate for upstreaming as `runFixtureFile()` into `@gcoredev/fastedge-test` so it's reachable from every SDK.

### CC-04 — `.replace()` semantics: production parity unknown (CRITICAL, 2026-05-13)

**Promoted from "guard convention" to "production parity question" after reading runner source for cacheControl validation.**

The fastedge-test runner implements `proxy_replace_header_map_value` as **upsert** (filter-out-then-add) — `.replace()` works whether or not the header pre-exists. See `@gcoredev/fastedge-test@0.2.1` `dist/lib/index.js` lines 1108-1119.

The `headers` example's source comment at line 130 says *"cannot replace a header that does not exist"*, implying production FastEdge has stricter semantics where `.replace()` on an absent header is a no-op.

Both interpretations have evidence:
- **Upsert wins:** body B-C1 isn't a bug; cacheControl is correct; headers example's comment is wrong.
- **Strict wins:** body B-C1 is real; cacheControl silently fails in production whenever upstream doesn't already set Cache-Control (= most responses); headers example's guard pattern is the correct convention.

**Affected rows (3 confirmed):**
- `body` B-C1 — `replace("transfer-encoding", "Chunked")` without guard. 1 call site.
- `cacheControl` CC-C1 — `.replace("Cache-Control", ...)` in 4+ places without guard. 4 call sites. Locally PASSes 7/7 only because runner upserts.
- `customErrorPages` CEP-C1 — `replace("Transfer-Encoding", "Chunked")` without guard. 1 call site. Locally PASSes 6/6 only because runner upserts. (Note: `replace("Content-Type", "text/html")` is CC-04-neutral because the builtin pre-sets Content-Type.)

**Not affected so far:**
- `cors` — uses `.add()` for all response header writes.

**Affected if not yet reached:** any remaining example using `.replace()` on response headers — possible candidates: `geoBlock`, `geoRedirect`, `largeDictionary`, `httpCall`, `jwt`, `kvStore`. Watch as we reach them.

**Resolution path:**
1. Verify on a live FastEdge deployment whether `.replace()` on an absent header (a) adds it, (b) is a no-op, or (c) returns an error. The visual debugger or `gcore-fastedge:live-test` is the right tool.
2. Update the headers example's line 130 comment to reflect reality.
3. If strict: fix body + cacheControl + any others to use the guard pattern OR switch to `.add()` (with idempotency caveats).
4. If upsert: no code changes needed; remove the "cannot replace…" comment from headers; comparator runs trust the result.

**This is the highest-priority blocker for `feature/more-examples-httpbin` merge.** Without resolution, we cannot trust Local Test ✅ marks for any row that uses `.replace()` without a guard.

### CC-05 — Secret-logging antipattern (1 violation, 1 correct, 2026-05-13)

**Status:** 1 confirmed violation, 1 confirmed correct example. Still pending `jwt` check.

- ❌ `variablesAndSecrets` V-C1: logs `"PASSWORD: " + password` at INFO — full secret value exposed.
- ✅ `apiKey` AK-C1: generic logs (`"API key validated successfully"`, `"API key validation failed"`, `"API_KEY secret not configured"`) — secret never appears in logs even on failure paths.

Decision pending: if `jwt` also violates (logs the token value), promote to confirmed cross-cutting and fix `variablesAndSecrets` to match `apiKey`'s pattern. If `jwt` is correct, the violation is localised to `variablesAndSecrets` and the fix is single-file.

### CC-06 — Inconsistent `setLogLevel` convention across examples (candidate, 2026-05-13)

Reviewed examples so far split into three groups: explicit `info` (`body`, `headers`), explicit `debug` (`variablesAndSecrets`), and no `setLogLevel` at all (`helloWorld`, `logTime`, `properties`). Examples without `setLogLevel` rely on SDK defaults — brittle if the default ever changes. Recommendation: standardise on `setLogLevel(LogLevelValues.info)` in every example unless there's an explicit reason otherwise (which should be commented). Pairs with HW-C1, LT-C1, V-C4.

### CC-07 — README structural inconsistency (candidate, 2026-05-13)

Reviewed READMEs vary in structure. `helloWorld` is minimal (no "What it does", no "Deploy"). `logTime`, `body`, `headers`, `variablesAndSecrets`, `abTesting` each have a "What it does" but differ in depth. None have a uniform "Expected behavior / logs to expect" section that would tell a developer what running the example should show them. Consider standardising on a template: Title → What it does → Configuration (if any) → Build → Deploy → Expected behavior / logs. Decide on the template after a few more examples are reviewed so we pick the right shape.

### CC-08 — SDK `getEnv` crashes on uninitialized WASI env (2026-05-13)

The SDK's `getEnv` (`assembly/fastedge/dictionary.ts` line 14–20) calls `process.env.has(name)` which assumes the WASI env table is initialized. When the fastedge-test runner runs a proxy-wasm flow without dotenv enabled, the env table is corrupted/missing and `process.env.has()` traps with `RuntimeError: memory access out of bounds`. This is reachable by any example fixture that does not enable dotenv. Production FastEdge guarantees an at-least-empty WASI env, so the SDK is allowed to assume this — the gap is in the runner, not the SDK.

**Confirmed instances (2 examples):**
- `abTesting/missing-config.test.json` — intentionally no `dotenv`, tests "no env vars" error path. Example's `if (experimentName === "") { send 500 }` is unreachable.
- `geoBlock/missing-config.test.json` — same pattern, same trace. Example's `if (!blacklist) { send 500 }` is unreachable.

Both produce identical stack traces: `wasi_process.ts(91:12)` → `Map.has` → `getEnv`. The runner gap is real and reproducible.

Two paths to fix:
1. **Runner fix (preferred):** Always initialize at least an empty WASI env for proxy-wasm runners. Upstream in `@gcoredev/fastedge-test`.
2. **Fixture workaround (interim):** Author convention requires every `.test.json` to set `"dotenv": { "enabled": true, "path": "..." }`. Pointing to an empty or non-existent `.env` should initialize an empty env.

Until resolved, validator rows that exercise the "no env" error path will be ⚠️ blocked on AB-S1 / CC-08.

### CC-09 — Runner drops `send_http_response` additional headers (2026-05-13)

`@gcoredev/fastedge-test@0.2.1` runner has a known TODO in its `proxy_send_local_response` host-call shim (`dist/lib/index.js` lines 1201–1218):

```js
if (headerPairsLen > 0) {
  const headerBytes = this.memory.readBytes(headerPairsPtr, headerPairsLen);
  const headers = HeaderManager.deserializeBinary(headerBytes);
  this.logDebug(`send_local_response headers (not merged): ${JSON.stringify(headers)}`);
}
this.localResponse = { statusCode, statusText, body };
```

The runner correctly receives and deserializes the headers array passed to `send_http_response`, but then **discards them** — `localResponse` stores only `statusCode/statusText/body`. The `"(not merged)"` debug message suggests this is a deliberate TODO awaiting implementation. As a result, any example that uses `send_http_response` with response headers cannot fully validate those headers locally.

First confirmed by **apiKey/missing-header.test.json** (asserts `WWW-Authenticate: API-Key` per RFC 7235 for the 401 response). Will recur on any other example that uses `send_http_response` with non-empty headers — `customErrorPages` is the obvious candidate.

Fix path: upstream in `@gcoredev/fastedge-test` — merge deserialized headers into `localResponse.headers` and propagate to `FullFlowResult.finalResponse.headers`.

Until resolved, validator rows that assert headers set via `send_http_response` will be ⚠️ blocked on CC-09. `.live.json` files should still be authored correctly (asserting what the example contracts to deliver) — the live harness verifies the assertion is correct in production.

### CC-11 — AssemblyScript `||` short-circuit on empty strings (REVISED 2026-05-13)

**Revised after WAT inspection of `jwt` (which empirically passed `if (!secret)` on empty secret) — CC-11 is narrower than originally claimed.**

The compiled WAT shows AS handles `!` and `||` on strings **differently**:

- **`!str`** compiles to `call $~lib/string/String.__not` — a runtime helper that returns `true` for both `null` and `""`. **Matches JS behavior.** Confirmed in `jwt-debug.wat` line 29607.
- **`a || b`** compiles to `if (i32) { a } else { b }` — a raw pointer-truthy check. The pointer to `""` is non-zero (the static empty-string object), so `|| b` never falls back when `a === ""`. **Does NOT match JS behavior.** Confirmed in `geoRedirect-debug.wat` lines 16887-16892.

**Confirmed broken (1 instance):**
- `geoRedirect` GR-C1 — line 88 `origin = countrySpecificOrigin || defaultOrigin` doesn't fall back. Empirically proven: `default.test.json` (FR not in env) returns `requestUrl: "/test"` instead of the README-documented fallback URL.

**Originally suspected, now CORRECTED to non-bugs (3 instances):**
- `geoRedirect` GR-C2 (line 39 `if (!defaultOrigin)`) — works correctly via `String.__not`. NOT a bug.
- `geoBlock` line 31 `if (!blacklist)` — works correctly. NOT a bug.
- `jwt` lines 39, 50, 71 `if (!str)` patterns — work correctly. NOT bugs (empirically confirmed: jwt's `missing-secret` fixture PASSES with 5/5).

**Correct fallback patterns observed in the codebase:**
- `cacheControl` lines 49-51: `getEnv("X") || "default"` — wait, this is the SAME PATTERN. Per WAT analysis it would ALSO be broken when the env var returns `""`. Need to re-test cacheControl: if the .env had the keys with empty values, would defaults kick in? CacheControl's `.env` has all three keys set with values, so the bug is masked.
- `geoRedirect` line 88 `countrySpecificOrigin || defaultOrigin` — broken (above).

**Fix:** any `a || b` pattern where `a` is a string from `getEnv`/`get_property` must use explicit `=== ""` comparison: `const x = a === "" ? b : a;`. Recommend adding a note to the SDK's `CLAUDE.md` Platform Constraints list. The `!str` pattern is fine.

**Audit needed:** grep all example sources for `getEnv\(.*\)\s*\|\|` or similar to find more instances. cacheControl is a likely candidate to re-examine.

### CC-12 — Runner does not implement KV store host calls (2026-05-13)

`@gcoredev/fastedge-test@0.2.1` does not implement the FastEdge KV store host functions. Any example or fixture that uses `kvStore.get()`, `.put()`, `.delete()`, or related APIs will trap or no-op when run through the local comparator.

**Affected:**
- `kvStore` — the only example currently exercising the KV API. Local Test column is 🚫.

**Implications:**
- The two-harness design (local `.live.json` validation + live `gcore-fastedge:live-test`) still works for KV examples — but only the live half is meaningful. Local Test is skipped, not failed.
- Phase 2 (live-deploy parity) MUST include kvStore as a Live Candidate since it's the only KV demonstration. Marked ✓ in the candidate column.
- If future examples adopt KV (e.g. a session-store example), they'll inherit the same constraint.

**Fix path:** upstream in `@gcoredev/fastedge-test` — implement the KV host calls against an in-memory store. Until then, KV-using examples are live-test-only.

### CC-10 — `Farq:` debug prefix left in production code (2 confirmed, 2026-05-13)

Two confirmed instances of developer-handle prefixed log messages in production-bound example code:

- `abTesting` AB-C1: `assembly/index.ts` line 92-94 — `Farq: -> AbTestingContext -> onRequestHeaders -> newUrl: ${newUrl}`
- `cors` CO-C1: `assembly/index.ts` line 33 — `Farq: -> CorsContext -> onRequestHeaders -> origin: ${origin}`

Same pattern, same prefix — strong indicator these were committed during a single debugging session by the same developer. Need to:
1. Grep all remaining unreviewed examples for `Farq` or similar dev-handle prefixes.
2. Clean both confirmed instances in one targeted pass.
3. Consider adding a pre-commit check or CI grep to prevent recurrence.

This is purely cosmetic but should not ship — example code is copied and these stick around as confusing artifacts.

---

**Last Updated:** 2026-05-13 (Phase 0 comparator built at `tools/fixture-validator/`; pilot run completed against helloWorld/headers/logTime/properties; first cross-cutting findings logged)
