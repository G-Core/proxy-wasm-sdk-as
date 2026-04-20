# Changelog (Agent Decision Log)

Use `grep` to search this file — do not read linearly as it grows.

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
