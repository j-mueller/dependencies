# Findings

## 2026-08-31 — Repository baseline

**Context:** Inspected the repository before choosing project conventions.

**Finding:** The repository contains only the Nix development flake, license, and
an untracked `README.md` containing `# dependencies`. There is no JavaScript
project, test framework, or existing application architecture.

**Decision:** Use a small Vite React application with vertical feature modules.
Keep graph projection, layout, import mapping, and UI separate because each has a
distinct external boundary or independently testable rule.

**Impact:** The project needs a complete but minimal TypeScript toolchain. No
legacy conventions constrain the design.

## 2026-08-31 — Graph and styling libraries

**Context:** Checked current official documentation for React Flow, ELK, and
Tailwind CSS.

**Finding:** React Flow's official ELK example uses `@xyflow/react` with
`elkjs/lib/elk.bundled.js` and asynchronous layout. React Flow documents ELK as
supporting dynamic node sizes, sub-flow layout, and edge routing. Tailwind CSS's
current Vite setup uses `tailwindcss` plus `@tailwindcss/vite` and a single
`@import "tailwindcss"` stylesheet entry.

**Decision:** Use React Flow for canvas interaction and ELK's layered algorithm
for layout. Model hierarchy in application state rather than React Flow group
nodes so collapsed-edge projection stays explicit and testable. Use Tailwind's
Vite plugin.

**Impact:** Layout is an asynchronous adapter around pure visible-graph
projection. The UI remains a static bundle.

Sources:

- https://reactflow.dev/examples/layout/elkjs
- https://reactflow.dev/learn/layouting/layouting
- https://tailwindcss.com/docs/installation/using-vite

## 2026-08-31 — GitHub relationship import

**Context:** Verified how current GitHub APIs expose dependencies, sub-issues,
parents, and pull request associations.

**Finding:** GitHub CLI's `gh issue list/view --json` supports `blockedBy`,
`blocking`, `parent`, `subIssues`, and `closedByPullRequestsReferences`. GitHub's
REST API also has first-class dependency and sub-issue endpoints. The closing PR
field is a precise, machine-readable subset of the broader phrase “associated
PRs.”

**Decision:** Use `gh issue list --state all --json ...` as the local adapter and
map `closedByPullRequestsReferences` to `pullRequests`. Import `blockedBy` as a
dependent-to-prerequisite edge. Import `parent` and `subIssues` into one stable
child-to-parent relationship identity. Preserve metadata by matching stable task
and relationship IDs during refresh.

**Impact:** Authentication remains outside the application. Version 1 documents
that associated PRs means PRs GitHub reports as closing the issue.

Sources:

- https://cli.github.com/manual/gh_issue_list
- https://cli.github.com/manual/gh_issue_view
- https://docs.github.com/en/rest/issues/issue-dependencies
- https://docs.github.com/en/rest/issues/sub-issues

## 2026-08-31 — UI component discovery

**Context:** Checked available shadcn registry discovery support before planning
custom UI components.

**Finding:** No shadcn MCP tools are configured. The local registry catalog lists
official `card`, `button`, and `sheet` primitives as relevant building blocks,
but no task DAG component. React Flow already owns the specialized graph surface.

**Decision:** Use semantic React markup styled directly with Tailwind for the
small control and details surfaces. Avoid adding shadcn solely to wrap three
simple primitives.

**Impact:** The dependency surface stays small and the custom work is limited to
domain-specific graph nodes and panels.

## 2026-08-31 — Test-first plan correction

**Context:** Re-read the approved plan before starting implementation.

**Finding:** Phase 1 originally placed the runtime schema before its validation
tests, which conflicts with the required red-green-refactor workflow.

**Decision:** Swap Tasks 1.2 and 1.3 so schema tests fail before the runtime schema
is implemented. Keep toolchain configuration first because configuration is the
explicit TDD exception.

**Impact:** Acceptance criteria and scope are unchanged. The implementation order
now produces a meaningful red test.

## 2026-08-31 — ELK type packaging

**Context:** Installed the Phase 1 dependencies.

**Finding:** npm returned `E404` for `@types/elkjs`; the package does not exist.
The `elkjs` package ships its own TypeScript declarations.

**Decision:** Remove `@types/elkjs` and use the declarations bundled with `elkjs`.

**Impact:** No replacement dependency is required.

## 2026-08-31 — Vite and Vitest compatibility

**Context:** Ran the initial TypeScript gate after dependency installation.

**Finding:** Vitest 3 resolved an older nested Vite type while the application uses
Vite 8, making plugin types structurally incompatible under
`exactOptionalPropertyTypes`.

**Decision:** Align Vitest and related browser-test packages to their current
releases, including Vitest 4, which supports the current Vite generation.

**Impact:** The shared Vite/Vitest configuration can remain type-safe without
casts or relaxed compiler settings.

## 2026-08-31 — Sample validation command

**Context:** Validated `public/tasks.json` directly through the runtime schema.

**Finding:** `tsx -e` emits the inline snippet as CommonJS, so top-level `await`
is unavailable even though the project itself is ESM.

**Decision:** Use a synchronous read in this one-off verification command. Runtime
application code remains asynchronous where it performs browser I/O.

**Impact:** No application change is required.
