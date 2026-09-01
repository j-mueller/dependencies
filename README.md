# Task Atlas

Task Atlas is a static React application for exploring GitHub issues as a task
dependency graph. It displays top-level tasks first, expands subtask hierarchies
on demand, and projects relationships from hidden children onto their nearest
visible ancestors. ELK provides the layered graph layout.

The browser reads one JSON file. It needs no server, database, or GitHub token.

## Run locally

Enter the Nix development shell and install the project dependencies:

```sh
nix develop
npm install
npm run dev
```

Vite serves the sample graph from `public/tasks.json`. Use **Open JSON** in the
toolbar to inspect another conforming file without replacing the sample on disk.

Run all local quality gates with:

```sh
npm run check
```

`npm run build` produces the deployable static site in `dist/`.

## JSON format

The source file is a versioned task graph. Schema version 1 uses a non-negative
number of days for `duration`. A later schema version can introduce estimate
distributions without making the current field ambiguous.

```json
{
  "schemaVersion": 1,
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

Task status is `open`, `completed`, or `not-planned`. Execution type is
`internal` when a known resource under project control can do the work, or
`external` when the project must wait for an outside event or party. Task and
relationship `metadata` values may contain any JSON object content.

Every relationship has a stable ID, a `kind`, two task IDs, and local metadata:

```json
{
  "id": "depends-on:github:acme/widget#12->github:acme/widget#8",
  "kind": "depends-on",
  "source": "github:acme/widget#12",
  "target": "github:acme/widget#8",
  "metadata": { "reason": "Release requires approval" }
}
```

Relationship direction is significant:

- `depends-on` points from the dependent task to its prerequisite.
- `subtask-of` points from the child task to its parent.

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
