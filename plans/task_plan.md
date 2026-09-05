# Task Plan: GitHub Task DAG Web UI

## Objective

Build a static React application that loads a versioned JSON task graph, lays it
out with ELK, expands and collapses GitHub sub-issue hierarchies, and aggregates
hidden child dependencies onto their visible ancestors. Add a local GitHub CLI
import command that refreshes GitHub-owned fields while preserving project-local
metadata.

## Constraints

- The browser application has no server, database, or runtime GitHub access.
- GitHub access happens through an explicit local import command and the user's
  existing `gh` authentication.
- The JSON format is the source of truth and is validated at load time.
- Relationship directions are explicit: `depends-on` points from the dependent
  task to its prerequisite; `subtask-of` points from child to parent.
- Duration is a non-negative number in days for schema version 1. A future
  schema version can replace it with a discriminated estimate distribution.
- Local task and relationship metadata survives repeated GitHub imports.
- The existing untracked `README.md` is preserved and expanded only with project
  documentation.

## Phases

### Phase 1: Project and contract [DONE]

- [x] Task 1.1: Scaffold Vite, React, Tailwind CSS, Vitest, Oxlint, and strict
      TypeScript configuration → `package.json`, `package-lock.json`,
      `vite.config.ts`, `tsconfig*.json`, `.oxlintrc.json`, `index.html`
- [x] Task 1.2: Add failing tests for the versioned schema and graph validation →
      `src/model/task-graph.test.ts`
- [x] Task 1.3: Implement the minimum validation boundary and sample project data →
      `src/model/task-graph.ts`, `public/tasks.json`

### Phase 2: Graph projection and layout [DONE]

- [x] Task 2.1: Add failing tests for top-level visibility, recursive expansion,
      relationship accrual, deduplication, and cycles →
      `src/graph/project-visible-graph.test.ts`
- [x] Task 2.2: Implement visible graph projection and aggregated edge provenance →
      `src/graph/project-visible-graph.ts`
- [x] Task 2.3: Add failing ELK adapter tests, then implement deterministic layered
      layout → `src/graph/layout.test.ts`, `src/graph/layout.ts`

### Phase 3: GitHub importer [DONE]

- [x] Task 3.1: Add failing fixture-based tests for issue mapping, dependencies,
      sub-issues, closing pull requests, and metadata preservation →
      `src/import/github-import.test.ts`, `src/import/fixtures/*.json`
- [x] Task 3.2: Implement pure GitHub-to-project mapping and merge logic →
      `src/import/github-import.ts`
- [x] Task 3.3: Implement the `gh issue list` CLI adapter and import entrypoint →
      `scripts/import-github.ts`, `package.json`

### Phase 4: Interactive UI [DONE]

- [x] Task 4.1: Add failing component tests for initial top-level rendering,
      expansion, selection, and invalid-file errors → `src/App.test.tsx`
- [x] Task 4.2: Implement the React Flow canvas, custom task nodes, relationship
      styling, ELK relayout, and expand/collapse interaction → `src/App.tsx`,
      `src/components/TaskGraph.tsx`, `src/components/TaskNode.tsx`
- [x] Task 4.3: Implement task details, graph legend, loading/error states, and local
      JSON file loading → `src/components/TaskDetails.tsx`,
      `src/components/GraphToolbar.tsx`
- [x] Task 4.4: Add responsive Tailwind styling and accessibility checks →
      `src/index.css`, `src/App.test.tsx`

### Phase 5: Documentation and verification [DONE]

- [x] Task 5.1: Document setup, JSON format, relationship semantics, local metadata,
      and GitHub import workflow → `README.md`
- [x] Task 5.2: Update the Nix shell for project-local verification tools if needed →
      `flake.nix`, `flake.lock`
- [x] Task 5.3: Run formatting, lint, typecheck, unit/component tests, production
      build, and Nix flake checks
- [x] Task 5.4: Review the finished change for correctness, simplicity, security,
      performance, and source-comment quality

### Phase 6: Project import and non-destructive upsert [DONE]

- [x] Task 6.1: Add failing tests for project target parsing, project membership,
      multi-repository import, and non-destructive upserts →
      `src/import/github-cli.test.ts`, `src/import/github-import.test.ts`
- [x] Task 6.2: Implement explicit project targets and project item parsing →
      `src/import/github-cli.ts`, `src/import/github-project.ts`
- [x] Task 6.3: Implement multi-repository upserts that retain unrelated tasks and
      relationships → `src/import/github-import.ts`
- [x] Task 6.4: Update the importer entrypoint and documentation →
      `scripts/import-github.ts`, `README.md`
- [x] Task 6.4b: Replace unsupported `gh issue list` relationship fields with
      batched GitHub GraphQL issue queries → `src/import/github-graphql.ts`,
      `scripts/import-github.ts`, `src/import/*.test.ts`
- [x] Task 6.5: Run all checks and import `realfi-co` project 4 into
      `public/tasks.json`

### Phase 7: Backend-owned task creation [DONE]

- [x] Task 7.1: Add failing tests for local task construction, atomic graph
      persistence, and HTTP task creation → `src/model/task-graph.test.ts`,
      `server/*.test.ts`
- [x] Task 7.2: Extend the graph contract with local task sources and implement
      the JSON graph store → `src/model/task-graph.ts`, `server/graph-store.ts`
- [x] Task 7.3: Implement the production Fastify server and task API →
      `server/app.ts`, `server/index.ts`, `tsconfig.server.json`
- [x] Task 7.4: Add the accessible task form and connect the frontend to the API
      → `src/components/CreateTaskDialog.tsx`, `src/App.tsx`,
      `src/components/GraphToolbar.tsx`
- [x] Task 7.5: Document deployment and run all unit, integration, accessibility,
      build, and Nix checks → `README.md`
- [x] Task 7.6: Review the backend boundary, write safety, UI behavior, and
      finished diff

### Phase 8: Interactive task graph editing [DONE]

- [x] Task 8.1: Add failing tests for recent creators and persisted dependency
      creation
- [x] Task 8.2: Add an editable recent-creators control to task creation
- [x] Task 8.3: Add serialized depends-on persistence and its HTTP client/API
- [x] Task 8.4: Enable node dragging and connector-driven dependency creation
- [x] Task 8.5: Verify unit, integration, type, lint, build, and browser behavior
- [x] Task 8.6: Review the finished implementation and restart the live instance

### Phase 9: Selection and deletion [DONE]

- [x] Task 9.1: Add failing store and API tests for relationship deletion and
      cascading task deletion → `server/*.test.ts`
- [x] Task 9.2: Add failing component tests for edge inspection, metadata, and
      confirmed task/edge deletion → `src/App.test.tsx`
- [x] Task 9.3: Implement serialized deletion contracts and HTTP clients →
      `src/model/task-graph.ts`, `server/*.ts`, `src/api/task-api.ts`
- [x] Task 9.4: Implement mutually exclusive node/edge selection and inspector
      views → `src/App.tsx`, `src/components/*.tsx`
- [x] Task 9.5: Verify tests, accessibility, builds, browser behavior, and the
      preserved live task sheet
- [x] Task 9.6: Review the final diff and restart the live instance

### Phase 10: Required-for relationship direction [DONE]

- [x] Task 10.1: Add failing schema, importer, store, API, projection, and UI tests
- [x] Task 10.2: Migrate schema version 1 `depends-on` links into version 2
      `is-required-for` links with reversed endpoints
- [x] Task 10.3: Update GitHub import, connector persistence, projection, labels,
      and edge styling for source-as-prerequisite semantics
- [x] Task 10.4: Migrate bundled and live JSON files without losing local metadata
- [x] Task 10.5: Verify tests, formatting, lint, types, builds, Nix, and browser behavior
- [x] Task 10.6: Review the finished implementation and restart the live instance

### Phase 11: Continuous node dragging [DONE]

- [x] Task 11.1: Add a failing component regression test for intermediate drag positions
- [x] Task 11.2: Update controlled node positions during pointer movement
- [x] Task 11.3: Verify tests, lint, types, build, and live browser behavior
- [x] Task 11.4: Review the change and keep the live instance running

### Phase 12: Complete tasks and hide completed work [DONE]

- [x] Task 12.1: Add failing store and API tests for persisted task completion
- [x] Task 12.2: Add failing component tests for marking a selected task done
- [x] Task 12.3: Add failing graph-filter tests for completed nodes, incident edges,
      and unfinished children of completed parents
- [x] Task 12.4: Implement the validated status mutation through model, store,
      API, client, and task inspector
- [x] Task 12.5: Implement an accessible show/hide-completed graph filter
- [x] Task 12.6: Add a toolbar action that reruns the ELK layout for the current view
- [x] Task 12.7: Verify tests, accessibility, builds, Nix, and live browser behavior
- [x] Task 12.8: Review the finished implementation and keep the live instance running

### Phase 13: Cancelled tasks and faster creation [DONE]

- [x] Task 13.1: Add failing contract and UI tests for the cancelled status
- [x] Task 13.2: Add failing UI tests for newest-creator prepopulation and
      Control+Enter submission
- [x] Task 13.3: Implement the status, creator default, and keyboard shortcut
- [x] Task 13.4: Verify tests, accessibility, builds, Nix, and browser behavior
- [x] Task 13.5: Review the finished implementation and preserve the live sheet

### Phase 14: Cancel existing tasks [DONE]

- [x] Task 14.1: Add a failing inspector test for persisted cancellation
- [x] Task 14.2: Generalize the selected-task status action and add **Cancel task**
- [x] Task 14.3: Verify tests, accessibility, builds, Nix, and browser behavior
- [x] Task 14.4: Review the finished implementation and preserve the live sheet

### Phase 15: Hide cancelled tasks [DONE]

- [x] Task 15.1: Add failing filter and UI tests for cancelled tasks
- [x] Task 15.2: Treat completed and cancelled statuses as hidden terminal work
- [x] Task 15.3: Clear selection when cancellation hides the selected task
- [x] Task 15.4: Verify checks, browser behavior, and the preserved live sheet
- [x] Task 15.5: Review the finished implementation
- [x] Phase 16: Edit task execution type
  - [x] Task 16.1: Specify partial task updates in store, API, and UI tests
  - [x] Task 16.2: Persist execution type changes through the atomic task update path
  - [x] Task 16.3: Add the execution selector to the task inspector
  - [x] Task 16.4: Run quality gates and browser persistence verification
  - [x] Task 16.5: Review the finished implementation
- [x] Phase 17: Prevent action labels from wrapping
  - [x] Task 17.1: Reproduce narrow secondary action buttons in a UI test
  - [x] Task 17.2: Keep Relayout and Cancel task at their intrinsic widths
  - [x] Task 17.3: Run quality gates and browser verification
- [x] Phase 18: Create subtasks from the inspector
  - [x] Task 18.1: Specify atomic subtask creation in store, API, and UI tests
  - [x] Task 18.2: Add the atomic subtask persistence endpoint
  - [x] Task 18.3: Reuse the task dialog from a New sub-task inspector action
  - [x] Task 18.4: Run quality gates and browser verification
  - [x] Task 18.5: Review the finished implementation

## Dependencies

- Phase 2 depends on the schema contract in Phase 1.
- Phase 3 depends on the schema contract but can remain isolated from browser code.
- Phase 4 depends on graph projection and ELK layout behavior.
- Phase 5 begins after all implementation phases are green.
- Phase 6 extends the importer after the initial UI feature commit.
- Phase 7 depends on the graph contract and replaces browser-only graph loading
  with a backend-owned JSON persistence boundary.

## Acceptance Criteria

- [x] The default view displays only tasks with no `subtask-of` parent.
- [x] Clicking a task with children toggles its direct children; nested parents can
      be expanded independently.
- [x] Visible nodes and relationships are laid out by ELK's layered algorithm.
- [x] Hidden child dependencies are represented between nearest visible ancestors,
      with duplicate projected edges collapsed and counted.
- [x] Expanded children show their `subtask-of` links and applicable dependency
      links.
- [x] Selecting a task shows title, description, creation time, status, creator,
      associated closing pull requests, duration, execution type, source link, and
      local metadata.
- [x] Superseded by Phase 7: the backend owns the configured JSON file instead of
      loading arbitrary browser-local files.
- [x] Invalid JSON, missing references, duplicate IDs, invalid durations, and graph
      cycles produce clear errors instead of a broken canvas.
- [x] The GitHub import command imports issues, blocked-by relationships,
      sub-issues, parents, and closing pull requests through `gh`.
- [x] Re-import preserves local metadata for tasks and stable relationships.
- [x] Superseded by Phase 7: production runs one Node service that serves the SPA
      and persistence API.
- [x] Lint, strict typecheck, tests, build, and Nix flake checks pass.
- [x] `--project OWNER/NUMBER` imports issues from every repository represented in
      the project.
- [x] Re-import updates GitHub-owned fields on matching task IDs.
- [x] Re-import retains local task fields, relationship metadata, unrelated tasks,
      and unrelated relationships.
- [x] The Cross Chain project imports successfully without discarding existing JSON
      records.
- [x] The production backend serves the built React application and current graph.
- [x] A user can create a local task from the UI with title, description, status,
      creator, duration, and execution type.
- [x] Created tasks receive stable local IDs and are validated before persistence.
- [x] The backend writes the complete graph atomically to the configured JSON file.
- [x] Failed validation or persistence leaves the JSON file unchanged and returns a
      clear API/UI error.
- [x] Development uses a Vite proxy while production runs one Node process.
- [x] The Created by field suggests distinct creators ordered by most recent use
      while accepting new values.
- [x] A pointer can reposition a visible task node without changing task data.
- [x] Connecting one task's source handle to another task's target handle creates
      and persists a depends-on relationship.
- [x] Invalid, duplicate, self-referential, or cyclic dependencies do not modify
      the JSON graph.
- [x] Selecting a displayed edge shows its relationship type and underlying local
      metadata in the side panel.
- [x] Deleting a displayed edge confirms and atomically removes every underlying
      relationship represented by that edge.
- [x] Deleting a task confirms and atomically removes the task plus its incident
      relationships.
- [x] Failed or stale deletion requests leave the JSON graph unchanged and show a
      clear error.
- [x] An `is-required-for` arrow from A to B means B needs A.
- [x] Version 1 `depends-on` relationships migrate by reversing endpoints while
      preserving relationship metadata.
- [x] Required-for edges are solid and subtask-of edges are dashed in both the
      graph and legend.
- [x] A selected open task can be marked completed and the JSON file is updated
      atomically.
- [x] Completed tasks can be hidden without hiding their unfinished descendants.
- [x] Relationships incident to hidden completed tasks do not appear in the graph.
- [x] Relayout discards manual positions and reruns ELK for the current graph view.
- [x] A task can use the `cancelled` status throughout validation and the UI.
- [x] New Task prepopulates Created by from the task with the latest creation time.
- [x] Control+Enter submits a valid New Task form through the normal save flow.
- [x] A selected non-cancelled task can be cancelled through the inspector.
- [x] **Hide completed** also hides cancelled tasks and counts both statuses.
- [x] A selected task can switch between internal and external execution, and the
      JSON file is updated atomically without changing unrelated task fields.
- [x] Relayout and Cancel task remain on one line with aligned icons.
- [x] A selected task offers New sub-task, which creates a local task and its
      subtask-of relationship in one atomic JSON update.
