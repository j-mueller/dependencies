# Task Atlas

Task Atlas is a React and Node application for exploring GitHub issues and local
tasks as a dependency graph. It displays top-level tasks first, expands subtask
hierarchies on demand, and projects relationships from hidden children onto their
nearest visible ancestors. ELK provides the layered graph layout.

The Node service owns one JSON file and serves both the API and the production
frontend. It requires no database. GitHub access remains isolated to the local
import command and its existing `gh` authentication.

## Run locally

Enter the Nix development shell and install the project dependencies:

```sh
nix develop
npm install
npm run dev
```

This starts the API on `http://127.0.0.1:3000` and Vite on
`http://127.0.0.1:5199`. Open the Vite URL during development. It proxies `/api`
requests to the backend. **New task** creates a project-local task and persists
the complete validated graph to `public/tasks.json`. The **Created by** field
starts with the newest task's creator, suggests other recently used values, and
accepts new ones. Press Ctrl+Enter anywhere in the New Task pane to create the
task. Drag a task card to reposition it. Drag from a task's right connector to
another task's left connector to record that the first task is required for the
second. **Relayout** reruns ELK and resets manual positions.

Select a task or relationship to inspect it in the side panel. Relationship
details include the type, visible endpoints, and local metadata from every JSON
relationship represented by the displayed edge. Delete actions require
confirmation. Deleting a task also deletes all relationships connected to it.
Choose **New sub-task** on a selected task to create a local child and its
`subtask-of` relationship in one atomic update. Select an unfinished task and
choose **Mark done** to persist its completed status. Choose **Cancel task** to
persist its cancelled status. **Hide completed** removes completed and cancelled
tasks and their incident links from the current view while keeping unfinished
children visible.

Run all local quality gates with:

```sh
npm run check
```

Build and run the production service with:

```sh
npm run build
npm start
```

The production service listens on `127.0.0.1:3000` and serves the compiled SPA
from `dist/`. Configure it with these environment variables:

- `HOST`: listen address. Keep the default for local use and SSH forwarding.
- `PORT`: listen port. Defaults to `3000`.
- `TASK_GRAPH_PATH`: JSON graph path. Defaults to `public/tasks.json`.
- `STATIC_ROOT`: compiled frontend directory. Defaults to `dist`.

The API validates graph reads, task creation and updates, and relationship writes.
It serializes concurrent graph changes within the service and replaces the JSON
file with an atomic rename, so clients never observe a partially written graph.

The service intentionally defaults to the loopback interface and does not include
authentication. Keep it behind SSH forwarding for personal use. Add an
authenticated reverse proxy before binding it to a shared network. The service
process needs read and write access to `TASK_GRAPH_PATH` and its parent directory.

## JSON format

The source file is a versioned task graph. Schema version 2 uses a non-negative
number of days for `duration`. A later schema version can introduce estimate
distributions without making the current field ambiguous.

```json
{
  "schemaVersion": 2,
  "project": {
    "name": "Release plan",
    "sourceRepository": "acme/widget",
    "importedAt": "2026-08-31T12:00:00Z"
  },
  "tasks": [
    {
      "id": "github:acme/widget#12",
      "source": {
        "provider": "github",
        "repository": "acme/widget",
        "issueNumber": 12,
        "url": "https://github.com/acme/widget/issues/12"
      },
      "title": "Ship widget",
      "description": "Coordinate the release.",
      "createdAt": "2026-08-01T10:00:00Z",
      "status": "open",
      "createdBy": {
        "login": "octocat",
        "url": "https://github.com/octocat"
      },
      "pullRequests": [],
      "duration": 3,
      "executionType": "internal",
      "metadata": { "priority": "high" }
    }
  ],
  "relationships": []
}
```

Task status is `open`, `completed`, `cancelled`, or `not-planned`. Execution type is
`internal` when a known resource under project control can do the work, or
`external` when the project must wait for an outside event or party. Task and
relationship `metadata` values may contain any JSON object content. Select a task
in the graph to change its execution type from the inspector.

Tasks created in the UI use a local source instead of a GitHub issue identity:

```json
{
  "id": "local:9ca29d0a-c37d-49f7-98ed-4d8379776c69",
  "source": { "provider": "local" },
  "title": "Write release notes",
  "description": "Summarize the delivered changes.",
  "createdAt": "2026-09-01T08:00:00.000Z",
  "status": "open",
  "createdBy": { "login": "jann" },
  "pullRequests": [],
  "duration": 0.5,
  "executionType": "internal",
  "metadata": {}
}
```

Every relationship has a stable ID, a `kind`, two task IDs, and local metadata:

```json
{
  "id": "is-required-for:github:acme/widget#8->github:acme/widget#12",
  "kind": "is-required-for",
  "source": "github:acme/widget#8",
  "target": "github:acme/widget#12",
  "metadata": { "reason": "Release requires approval" }
}
```

Relationship direction is significant:

- `is-required-for` points from the prerequisite to the task that needs it.
- `subtask-of` points from the child task to its parent.

Version 1 files are accepted and converted in memory by reversing each
`depends-on` relationship. Persist the conversion explicitly with:

```sh
npm run migrate:data -- PATH
```

Task IDs and relationship IDs must be unique. All endpoints must exist. A task
can have at most one parent. Self-links and cycles within either relationship
kind are rejected when the file loads.

When a child is hidden, each of its relationships accrues to its nearest visible
ancestor. Equivalent projected relationships are shown once with their count.
Expanding the parent restores the child's own nodes and links.

## Import GitHub issues

Install and authenticate the GitHub CLI, then import all issues from a repository:

```sh
gh auth login
npm run import:github -- OWNER/REPOSITORY
```

To import every issue represented in an organization project, including issues
from multiple repositories:

```sh
npm run import:github -- --project OWNER/PROJECT_NUMBER
```

The default output is `public/tasks.json`. Pass a second argument to write a
different file:

```sh
npm run import:github -- OWNER/REPOSITORY data/project.json
npm run import:github -- --project OWNER/PROJECT_NUMBER data/project.json
```

For project imports, the CLI discovers issue membership first and fetches each
represented repository once. Draft project items are ignored because they have
no GitHub issue identity. The importer reads issue titles, bodies, timestamps,
states, authors, blocking relationships, parent/sub-issue relationships, and
closing pull requests. It writes the output atomically after validating the
complete graph.

GitHub-owned fields refresh on every import. Existing project-local values are
preserved by stable ID:

- Task `duration`, `executionType`, and `metadata`.
- Relationship `metadata`.
- Project `name`.

New tasks default to one day, `internal`, and empty metadata. Edit those values
in the JSON file after the first import. Re-running the importer retains them.
The write is an upsert: matching tasks refresh, new tasks and relationships are
added, and records absent from the current import remain unchanged.
