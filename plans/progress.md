# Progress

## Session: 2026-09-01 — Backend task creation

### Actions

1. Confirmed that direct repository-file persistence is impossible from the
   static browser client, especially through an SSH tunnel.
2. Agreed with the user to introduce a proper backend rather than a Vite-only
   development endpoint.
3. Reviewed the existing graph contract, UI, tests, build configuration, and
   applicable architecture, React, TypeScript, TDD, and component guidance.
4. Chose a single Fastify production service with atomic JSON persistence and a
   Vite development proxy.
5. Ran the green baseline → PASS (41 tests).
6. Added schema, graph-store, and HTTP integration tests → RED for the missing
   local source and backend modules.
7. Implemented local task validation and a serialized atomic JSON graph store →
   focused tests PASS (15 tests across three files).
8. Implemented graph-read, task-create, validation-error, and SPA fallback routes
   in a production Fastify application → focused integration tests PASS.
9. Added failing UI tests for backend loading, creation, selection, and save errors
   → RED for the static data path and missing task form.
10. Added the task dialog, backend API client, local-source rendering, and toolbar
    action → component tests PASS (6 tests, including open-dialog axe scan).
11. Added a failing integration test for internal error disclosure, then installed
    a generic production error boundary → server tests PASS (5 tests).
12. Compiled and smoke-tested the production service against a temporary graph →
    graph read returned 81 tasks, task creation returned 201 and persisted task 82,
    and SPA fallback served `index.html`. The temporary graph was removed.
13. Ran the first full check → strict TypeScript rejected access to Fastify's
    `unknown` error value; added explicit status and message narrowing.
14. Completed the structured review → centralized task validation in the graph
    store, removed dead styles and test indirection, documented the loopback-only
    unauthenticated security boundary, and found no remaining critical or high
    issues.
15. Ran the final check inside the Nix shell with Node.js 22.23.2 → PASS (format,
    lint, strict typecheck, 52 tests, client build, and server build). Dependency
    audit and all-system Nix flake checks also PASS.
16. Ran a headless Chromium smoke check against a temporary graph → created a
    local task through the UI, persisted it through the real API, selected the new
    node, and observed no browser console or page errors. Removed all temporary
    test artifacts and restarted the live instance against the imported graph.

### Files Modified

- `server/` — production Fastify app, atomic graph store, and integration tests.
- `src/api/task-api.ts` — validated browser API boundary.
- `src/components/CreateTaskDialog.tsx` — accessible local task form.
- `src/App.tsx`, `src/components/*.tsx`, `src/index.css` — backend loading,
  creation flow, local-source rendering, and UI styles.
- `src/model/task-graph.ts` — local source and create-task contracts.
- `package.json`, `vite.config.ts`, `tsconfig*.json` — production build, service,
  and development proxy configuration.
- `README.md` — development, production, persistence, and security documentation.

### Status at End of Session

- Phase 7: DONE

### Status at End of Checkpoint

- Phase 7: IN PROGRESS (Task 7.1 next)

---

## Session: 2026-08-31

### Actions

1. Inspected repository files and Git state → found a minimal Nix-only baseline.
2. Reviewed applicable implementation, architecture, TypeScript, React, TDD, and
   UI discovery guidance → established the quality gates and planning workflow.
3. Checked current official GitHub, React Flow, and Tailwind documentation →
   confirmed the import fields and current library integration patterns.
4. Authored the implementation plan and recorded design decisions → awaiting plan
   review before code changes.
5. Added the Vite, React, Tailwind, Vitest, Oxlint, and strict TypeScript project
   configuration → dependency installation initially failed on a nonexistent
   `@types/elkjs` package.
6. Ran the initial lint and type gates → fixed import ordering and aligned Vitest
   with Vite 8 after TypeScript exposed duplicate Vite plugin types.
7. Completed Task 1.1 → dependency audit, formatting, lint, and strict typecheck
   pass.
8. Completed the schema red-green cycle → six focused tests cover valid input,
   invalid duration, duplicate IDs, missing references, and both cycle types.
9. Added representative sample project data → includes nested subtasks, internal
   and external tasks, closing PR data, and dependencies that exercise accrual.
10. Completed projection Tasks 2.1 and 2.2 with a red-green cycle → four tests
    cover top-level visibility, nested expansion, hidden-edge accrual, and
    deduplication with provenance.
11. Completed Task 2.3 with a red-green cycle → ELK adapter tests verify layered
    direction, deterministic coordinates, and empty graphs.
12. Completed importer Tasks 3.1 and 3.2 with a red-green cycle → four tests cover
    GitHub field mapping, both relationship directions, deduplication, malformed
    input, and preservation of local metadata.
13. Completed Task 3.3 with a red-green cycle → CLI tests cover argument validation
    and required GitHub fields; the entrypoint uses `execFile` and atomic output.
14. Completed Phase 4 → added the React Flow canvas, ELK relayout, expandable task
    nodes, details inspector, responsive Tailwind UI, local file loading, component
    tests, and axe accessibility coverage.
15. Added explicit initial node dimensions → React Flow renders before browser
    measurement and shares the fixed-size contract used by ELK.
16. Documented local setup, the versioned JSON contract, relationship semantics,
    static builds, and GitHub metadata preservation.
17. Reviewed the Nix shell → its Node.js 22 and project tooling already cover the
    application checks, so no flake change is needed.
18. Added Python Playwright and Nix-managed browser binaries to the development
    shell at the user's request → verified `import playwright` inside `nix develop`.
19. Ran desktop and mobile Chromium checks through the webapp-testing workflow →
    expansion, selection, details, and responsive layout pass without browser
    console or page errors.
20. Corrected post-layout viewport fitting after the browser check showed that
    React Flow fit the initial coordinates before ELK completed.
21. Completed the structured self-review → restricted clickable URLs to HTTP and
    HTTPS and added a regression test for executable URL schemes.

### Files Modified

- `plans/task_plan.md` — implementation phases, constraints, and acceptance criteria.
- `plans/findings.md` — repository, API, architecture, and UI research.
- `plans/progress.md` — session checkpoint.

### Test Results

- `npm test -- src/App.test.tsx`: PASS (4 tests).
- `npm run typecheck`: PASS.
- `npm run check`: PASS (28 tests, lint, strict typecheck, and production build).
- `nix flake check --all-systems path:$PWD`: PASS.
- Chromium desktop/mobile interaction check: PASS.

### Errors Encountered

- `npm install`: `@types/elkjs` returned `E404` → removed it because `elkjs`
  includes its own declarations.
- `npm run typecheck`: Vitest 3 and Vite 8 exposed incompatible plugin types →
  upgraded Vitest to the current Vite-compatible release.
- Inline sample validation used top-level `await` under `tsx -e` CommonJS output →
  rerun with a synchronous one-off file read.
- React Flow initially omitted custom nodes in JSDOM because they had no measured
  size → supplied `initialWidth` and `initialHeight` on each node.
- React Flow's pan handler received synthetic test clicks → marked node controls
  with its `nopan` class so controls remain independent of canvas gestures.

### Status at End of Session

- Phase 1: DONE
- Phase 2: DONE
- Phase 3: DONE
- Phase 4: DONE
- Phase 5: DONE

## Session: 2026-08-31 — Project importer extension

### Actions

1. Committed the initial task graph application as `faa9944`.
2. Resolved “Cross Chain” to `realfi-co` organization project 4.
3. Inspected project membership → found 86 issues across two repositories.
4. Ran the baseline suite → PASS (28 tests).
5. Added project-target, project-membership, and non-destructive multi-repository
   upsert tests → RED with six failures for the missing behavior.
6. Implemented project target parsing and project membership validation → focused
   tests PASS (14 tests). Full typecheck remains red until Tasks 6.3 and 6.4 add
   the upsert export and consume the new target union.
7. Implemented non-destructive multi-repository upserts → focused importer tests
   PASS (5 tests). Typecheck now fails only where the executable still expects the
   old repository-only argument shape.
8. Wired project discovery, repository filtering, and upsert batches into the CLI;
   documented project syntax and upsert behavior → focused tests, lint, and strict
   typecheck PASS.
9. Ran all 38 tests, build, lint, typecheck, and Nix checks → PASS.
10. Ran a live project import to `/tmp` → failed safely because `gh issue list`
    rejects relationship fields; no output was written. Confirmed the fields exist
    on GitHub's GraphQL `Issue` type and added Task 6.4b.
11. Replaced unsupported fields with validated batched GraphQL issue queries → the
    live dry run imported 75 issues and 9 relationships from project 4.
12. Upserted project 4 into `public/tasks.json` twice → counts remain stable at 81
    unique tasks and 15 unique relationships; all six sample tasks and their local
    metadata remain.
13. Completed the structured review → confirmed validated external inputs,
    non-shell GitHub execution, bounded GraphQL batching, and fail-closed nested
    relationship pagination.
14. Ran the final suite → PASS (41 tests, lint, strict typecheck, build, audit, and
    Nix checks).
15. Ran a redacted leak scan → one likely false positive in testnet transaction
    evidence; no credential value was exposed.

### Status

- Phase 6: DONE

### Status

- Phase 6: IN PROGRESS (Task 6.1 next)

## 2026-09-01: Phase 8 interactive graph editing

- Preserved the user-populated `.task-atlas/tasks.json` file with 4 tasks.
- Stopped the live development process before changing the frontend and API.
- Chose an editable HTML datalist for recent creator suggestions and React Flow's
  controlled node/connection callbacks for graph gestures.
- Added serialized atomic dependency creation through the model, graph store,
  Fastify API, frontend API, and React Flow connector callback.
- Added MRU creator suggestions, enabled node dragging, and kept auto-fit limited
  to ELK layout changes so manual drops remain stable.
- Passed 57 tests, lint, strict type checking, client/server builds, and a
  production Chromium check against a disposable graph.
- Browser verification covered arbitrary creator entry, node displacement,
  connector interaction, persisted relationship direction, and edge rendering.
- Reviewed the final diff for reuse, simplicity, validation, write safety, and
  performance. No critical or high-severity findings remain.

## 2026-09-01: Phase 9 selection and deletion

- Stopped the live process after confirming the user-populated sheet contains 4
  tasks and 1 relationship.
- Defined projected-edge deletion as removal of all provenance relationships,
  with an explicit affected-count confirmation.
- Defined task deletion as an atomic cascade over the task and all incident
  relationships.
- Added relationship and task deletion schemas, serialized graph-store mutations,
  HTTP routes and clients, stale-request handling, and encoded GitHub ID coverage.
- Added mutually exclusive task/edge selection, selected-edge emphasis, projected
  edge provenance inspection, metadata rendering, and confirmation dialogs.
- Passed 69 unit, API, component, stale-state, focus, and accessibility tests.
- Passed a production Chromium flow for edge selection, metadata inspection,
  cancellation, edge deletion, and cascading task deletion against disposable
  data.
- Reviewed reuse, complexity, validation, atomicity, focus behavior, XSS safety,
  and graph performance. No critical or high-severity findings remain.

## 2026-09-01: Phase 10 required-for direction

- Replaced the canonical `depends-on` kind with `is-required-for`, where the
  source is the prerequisite and the target is the task that needs it.
- Added schema version 2 and a version 1 migration that reverses dependency
  endpoints, regenerates stable IDs, and preserves local metadata.
- Updated GitHub blocked-by/blocking imports, graph creation APIs, React Flow
  connectors, projections, inspector labels, and accessible connector names.
- Removed React Flow edge animation because it visually dashed required-for
  links. Required-for links are solid with arrowheads; subtask links are dashed.
- Migrated `public/tasks.json` to 81 tasks and 15 relationships. Migrated the
  live sheet to schema version 2 with its 4 tasks and 0 relationships intact.
- Passed 73 tests, formatting, lint, strict type checking, client/server builds,
  dependency audit, Nix flake checks, and production Chromium style checks.
- Reviewed migration safety, importer direction, API validation, connector
  semantics, edge styling, and stale terminology. No critical or high-severity
  findings remain.

## 2026-09-01: Phase 11 continuous node dragging

- Added a component regression test that sends an intermediate React Flow drag
  event and asserts the controlled node position updates immediately.
- Moved position updates from `onNodeDragStop` to React Flow's controlled
  `onNodesChange` stream so task cards follow the pointer throughout a drag.
- Passed 74 tests, formatting, lint, strict type checking, and client/server
  builds.
- Verified in Chromium that a live node moved 105 pixels horizontally and 53
  pixels vertically before the mouse button was released.
- Reviewed render behavior, state scope, and test quality. No critical or
  high-severity findings remain.

## 2026-09-01: Phase 12 task completion, filtering, and relayout

- Added a validated task-status contract and a serialized atomic graph-store
  mutation exposed through `PATCH /api/tasks/:taskId`.
- Added **Mark done** to the selected-task inspector and persisted the canonical
  `completed` status without changing other task fields.
- Added **Hide completed** as view state. Filtering removes incident links before
  hierarchy projection, so unfinished children of completed parents remain
  visible as top-level work.
- Added **Relayout** to reset manual positions and rerun the existing ELK layered
  layout for the current graph view.
- Passed 83 tests, formatting, lint, strict type checking, client/server builds,
  dependency audit, and Nix flake checks.
- Passed a production Chromium flow for relayout, completion persistence, and
  hierarchy-safe filtering against disposable JSON data.
- Reviewed validation, atomicity, render behavior, filter complexity, and test
  quality. No critical or high-severity findings remain.

## 2026-09-01: Phase 13 cancelled tasks and faster creation

- Added `cancelled` to the shared task-status schema, New Task selector, graph
  badge, and task inspector.
- Prepopulated **Created by** from the task with the latest `createdAt` value while
  retaining the editable recent-creator suggestions.
- Added Ctrl+Enter submission through the form's native `requestSubmit()` path,
  preserving validation, pending state, API errors, and close-on-success behavior.
- Passed 85 tests, formatting, lint, strict type checking, client/server builds,
  dependency audit, and Nix flake checks.
- Passed a production Chromium flow that confirmed the newest creator default,
  cancelled selection, Ctrl+Enter persistence, dialog closure, and status display
  against disposable JSON data.
- Reviewed status exhaustiveness, keyboard listener cleanup, validation, and test
  quality. No critical or high-severity findings remain.

## 2026-09-01: Phase 14 cancel existing tasks

- Generalized the selected-task status mutation so inspector actions share the
  validated, atomic status API without duplicating request logic.
- Added **Cancel task** for every non-cancelled task. The action persists
  `cancelled`, shows **Cancelling…** while pending, and disappears on success.
- Kept **Mark done** available on cancelled tasks so a task can subsequently be
  completed without editing JSON.
- Passed 86 tests, formatting, lint, strict type checking, client/server builds,
  dependency audit, and Nix flake checks.
- Passed a production Chromium cancellation flow against disposable JSON and
  confirmed task metadata was preserved.
- Reviewed transition state, API reuse, validation, rendering, and test quality.
  No critical or high-severity findings remain.

## 2026-09-01: Phase 15 hide cancelled tasks

- Added one shared completed-or-cancelled predicate for graph filtering, legend
  counts, and post-status-update selection cleanup.
- Updated **Hide completed** to remove both completed and cancelled tasks plus
  their incident relationships before hierarchy projection.
- Kept unfinished descendants visible and left `not-planned` tasks unaffected.
- Passed 87 tests, formatting, lint, strict type checking, client/server builds,
  dependency audit, and Nix flake checks.
- Passed a production Chromium flow showing open, completed, and cancelled tasks,
  then confirming only open work remains when the filter is enabled.
- Reviewed predicate reuse, graph validity, render behavior, and test quality. No
  critical or high-severity findings remain.

## 2026-09-01: Phase 16 editable execution type

- Generalized the validated task PATCH contract so status and execution type use
  one serialized atomic graph-store mutation.
- Added an accessible Internal/External selector to the selected-task inspector.
- Preserved every task field omitted from a partial update and rejected empty or
  invalid task updates before persistence.
- Passed 90 tests, formatting, lint, strict type checking, client/server builds,
  dependency audit, and Nix flake evaluation.
- Passed a production Chromium flow that changed execution type in disposable
  JSON and confirmed unrelated title and metadata fields remained unchanged.
- Reviewed validation reuse, mutation serialization, pending UI state, error
  handling, security, performance, and test quality. No critical or high-severity
  findings remain.

## 2026-09-01: Phase 17 secondary action sizing

- Added a regression test for the Relayout and Cancel task button layouts.
- Kept both controls at their intrinsic widths and prevented their labels from
  wrapping while preserving centered icon alignment.
- Passed 91 tests, formatting, lint, strict type checking, client/server builds,
  dependency audit, and Nix flake evaluation.
- Confirmed in Chromium at an 800-pixel viewport that both controls use no-wrap
  text and contain their full content without horizontal overflow.
