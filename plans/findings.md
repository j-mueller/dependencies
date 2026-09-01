# Findings

## 2026-09-01 — Backend persistence boundary

**Context:** Creating a task must update the repository-side JSON file. A browser
reached through an SSH tunnel cannot write that remote file, and browser file APIs
would write to the user's local machine instead.

**Finding:** Fastify 5 supports Node.js 20 and newer. `@fastify/static` 8 and newer
is compatible with Fastify 5; the current releases are Fastify 5.12.1 and
`@fastify/static` 10.1.3. The official static plugin documents serving a Vite SPA.

**Decision:** Add one production Node service. It owns `public/tasks.json`, serves
the built SPA, and exposes only graph read and task-create routes. Keep Vite as a
development-only frontend server with an API proxy. Use an atomic temporary-file
rename for every graph write.

**Impact:** The JSON graph remains the source of truth and the GitHub importer
remains compatible. Production is no longer a static-only deployment, but it
still requires no database or separate application services.

**Security boundary:** The service binds to `127.0.0.1` by default and has no
application authentication. Personal access remains suitable through SSH
forwarding. A shared-network deployment requires an authenticated reverse proxy.
Internal failures are logged server-side and return a generic API message.

**Review:** Task input validation lives in the graph store so direct callers and
HTTP callers share one trusted boundary. Reads validate the entire graph. HTTP
writes are serialized inside the process and use a same-directory temporary file
plus atomic rename. The existing importer remains a separate maintenance writer
and should not run concurrently with UI task creation.

**UI discovery:** The local shadcn catalog identifies Dialog, Input, Select,
Textarea, and Button as the relevant primitives. No shadcn MCP is configured and
the project has no shadcn runtime, so the form will use semantic React controls
and the existing Tailwind visual language without adding a component framework.

---

## 2026-08-31 — Cross Chain project import

**Context:** The requested source is the organization-level GitHub Project named
“Cross Chain,” not a single repository.

**Finding:** `realfi-co` project 4 contains 86 issue items across
`realfi-co/realfi` and `realfi-co/realfi-cross-chain-spine`. The `gh project
item-list` JSON exposes membership through each item's `content.repository` and
`content.number`. Detailed dependency, hierarchy, author, and PR fields remain
available through one `gh issue list` call per repository.

**Decision:** Add `--project OWNER/NUMBER` as an explicit target. Discover project
membership first, fetch represented repositories once, filter those issue lists,
and upsert the batches by stable task and relationship IDs.

**Impact:** Existing repository imports remain compatible. Project imports can span
repositories without introducing a server or direct token handling.

`gh project view NUMBER --owner OWNER --format json` provides the project title and
URL. `gh project item-list NUMBER --owner OWNER --limit 10000 --format json`
provides issue membership. Draft items can be ignored because they have no GitHub
issue identity or relationship data.

**Upsert semantics:** Refresh GitHub-owned fields for matching tasks. Preserve task
duration, execution type, and metadata. Preserve every existing task and
relationship not present in the import. Preserve relationship metadata when an
imported stable relationship ID already exists.

---

## 2026-08-31 — Live GitHub relationship API

**Context:** The first live project dry run failed before writing output.

**Finding:** `gh issue list --json` in gh 2.89.0 rejects `blockedBy`, `blocking`,
`parent`, and `subIssues`. GitHub's live GraphQL schema exposes all four directly
on `Issue` as `IssueConnection` or `Issue` fields.

**Decision:** Use `gh issue list` only to discover issue numbers for legacy
repository imports. Fetch full selected issues through batched GraphQL aliases,
including dependency, hierarchy, author, and closing-PR connections. Validate the
GraphQL response and fail if any nested connection exceeds the requested page so
the importer cannot silently truncate relationships.

**Impact:** Add Task 6.4b before retrying the live import. No repository file was
written by the failed dry run.

The GraphQL implementation succeeded against the live project. A redacted leak
scan flagged one 40-character value in spine issue 53. Its issue context describes
deployed Sepolia/Cardano-preview contract evidence, so the match is consistent with
a public testnet address or transaction identifier rather than an AWS credential.
The scanner did not expose the value.

---

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
