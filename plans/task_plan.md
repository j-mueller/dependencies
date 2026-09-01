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
