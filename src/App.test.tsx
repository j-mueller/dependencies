import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";

import App from "./App";

expect.extend(toHaveNoViolations);

const layoutGraphMock = vi.hoisted(() =>
  vi.fn((nodes: readonly { id: string }[]) =>
    Promise.resolve({
      positions: new Map(
        nodes.map(({ id }, index) => [id, { x: index * 320, y: index * 40 }]),
      ),
      width: nodes.length * 320,
      height: 240,
    }),
  ),
);

vi.mock("./graph/layout", () => ({
  layoutGraph: layoutGraphMock,
}));

const graph = {
  schemaVersion: 2,
  project: { name: "Test roadmap", sourceRepository: "acme/roadmap" },
  tasks: [
    {
      id: "github:acme/roadmap#1",
      source: {
        provider: "github",
        repository: "acme/roadmap",
        issueNumber: 1,
        url: "https://github.com/acme/roadmap/issues/1",
      },
      title: "Launch roadmap",
      description: "Coordinate the release.",
      createdAt: "2026-08-01T10:00:00Z",
      status: "open",
      createdBy: { login: "octocat", url: "https://github.com/octocat" },
      pullRequests: [],
      duration: 4,
      executionType: "internal",
      metadata: { priority: "high" },
    },
    {
      id: "github:acme/roadmap#2",
      source: {
        provider: "github",
        repository: "acme/roadmap",
        issueNumber: 2,
        url: "https://github.com/acme/roadmap/issues/2",
      },
      title: "Build graph UI",
      description: "Render issues.",
      createdAt: "2026-08-02T10:00:00Z",
      status: "open",
      createdBy: { login: "hubot", url: "https://github.com/hubot" },
      pullRequests: [],
      duration: 2,
      executionType: "internal",
      metadata: {},
    },
    {
      id: "github:acme/roadmap#3",
      source: {
        provider: "github",
        repository: "acme/roadmap",
        issueNumber: 3,
        url: "https://github.com/acme/roadmap/issues/3",
      },
      title: "External approval",
      description: "Wait for approval.",
      createdAt: "2026-08-03T10:00:00Z",
      status: "completed",
      createdBy: { login: "ghost", url: "https://github.com/ghost" },
      pullRequests: [],
      duration: 3,
      executionType: "external",
      metadata: {},
    },
  ],
  relationships: [
    {
      id: "subtask-of:github:acme/roadmap#2->github:acme/roadmap#1",
      kind: "subtask-of",
      source: "github:acme/roadmap#2",
      target: "github:acme/roadmap#1",
      metadata: {},
    },
    {
      id: "is-required-for:github:acme/roadmap#3->github:acme/roadmap#2",
      kind: "is-required-for",
      source: "github:acme/roadmap#3",
      target: "github:acme/roadmap#2",
      metadata: { reason: "Approval gate" },
    },
  ],
};

describe("App", () => {
  beforeEach(() => {
    layoutGraphMock.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json(graph))),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("starts with top-level tasks and expands children on demand", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(
      await screen.findByRole("button", {
        name: "Select Launch roadmap",
        hidden: true,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Select External approval",
        hidden: true,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Select Build graph UI",
        hidden: true,
      }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Expand Launch roadmap",
        hidden: true,
      }),
    );

    expect(
      await screen.findByRole("button", {
        name: "Select Build graph UI",
        hidden: true,
      }),
    ).toBeInTheDocument();
  });

  it("describes connector direction as prerequisite to dependent", async () => {
    render(<App />);

    expect(
      await screen.findByLabelText(
        "Make Launch roadmap required for another task",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Make Launch roadmap require another task"),
    ).toBeInTheDocument();
  });

  it("shows all task attributes when a node is selected", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      await screen.findByRole("button", {
        name: "Select External approval",
        hidden: true,
      }),
    );

    expect(
      screen.getByRole("heading", { name: "External approval" }),
    ).toBeVisible();
    expect(screen.getByText("Wait for approval.")).toBeVisible();
    expect(screen.getByText("3 days")).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Execution" })).toHaveValue(
      "external",
    );
    expect(screen.getByText("ghost")).toBeVisible();
  });

  it("changes a selected task execution type through the API", async () => {
    const user = userEvent.setup();
    const externalTask = { ...graph.tasks[0], executionType: "external" };
    const externalGraph = {
      ...graph,
      tasks: [externalTask, ...graph.tasks.slice(1)],
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json(graph))
      .mockResolvedValueOnce(
        Response.json({ graph: externalGraph, task: externalTask }),
      );
    render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: "Select Launch roadmap",
        hidden: true,
      }),
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Execution" }),
      "external",
    );

    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        `/api/tasks/${encodeURIComponent("github:acme/roadmap#1")}`,
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ executionType: "external" }),
        }),
      ),
    );
    expect(screen.getByRole("combobox", { name: "Execution" })).toHaveValue(
      "external",
    );
  });

  it("marks a selected task completed through the API", async () => {
    const user = userEvent.setup();
    const completedTask = { ...graph.tasks[0], status: "completed" };
    const completedGraph = {
      ...graph,
      tasks: [completedTask, ...graph.tasks.slice(1)],
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json(graph))
      .mockResolvedValueOnce(
        Response.json({ graph: completedGraph, task: completedTask }),
      );
    render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: "Select Launch roadmap",
        hidden: true,
      }),
    );

    await user.click(screen.getByRole("button", { name: "Mark done" }));

    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        `/api/tasks/${encodeURIComponent("github:acme/roadmap#1")}`,
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "completed" }),
        }),
      ),
    );
    expect(
      within(screen.getByLabelText("Task details")).getByText("Completed"),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Mark done" }),
    ).not.toBeInTheDocument();
  });

  it("cancels a selected task through the API", async () => {
    const user = userEvent.setup();
    const cancelledTask = { ...graph.tasks[0], status: "cancelled" };
    const cancelledGraph = {
      ...graph,
      tasks: [cancelledTask, ...graph.tasks.slice(1)],
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json(graph))
      .mockResolvedValueOnce(
        Response.json({ graph: cancelledGraph, task: cancelledTask }),
      );
    render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: "Select Launch roadmap",
        hidden: true,
      }),
    );

    await user.click(screen.getByRole("button", { name: "Cancel task" }));

    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        `/api/tasks/${encodeURIComponent("github:acme/roadmap#1")}`,
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "cancelled" }),
        }),
      ),
    );
    expect(
      within(screen.getByLabelText("Task details")).getByText("Cancelled"),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Cancel task" }),
    ).not.toBeInTheDocument();
  });

  it("hides completed and cancelled tasks while keeping unfinished children visible", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({
        ...graph,
        tasks: graph.tasks.map((task) => {
          if (task.id === "github:acme/roadmap#1") {
            return { ...task, status: "completed" };
          }
          return task.id === "github:acme/roadmap#3"
            ? { ...task, status: "cancelled" }
            : task;
        }),
      }),
    );
    render(<App />);
    expect(
      await screen.findByRole("button", {
        name: "Select Launch roadmap",
        hidden: true,
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Hide completed" }));

    expect(
      within(screen.getByLabelText("Graph legend")).getByText("(2)"),
    ).toBeVisible();

    expect(
      screen.queryByRole("button", {
        name: "Select Launch roadmap",
        hidden: true,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Select External approval",
        hidden: true,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Select Build graph UI",
        hidden: true,
      }),
    ).toBeInTheDocument();
  });

  it("removes a newly cancelled task when terminal tasks are hidden", async () => {
    const user = userEvent.setup();
    const cancelledTask = { ...graph.tasks[0], status: "cancelled" };
    const cancelledGraph = {
      ...graph,
      tasks: [cancelledTask, ...graph.tasks.slice(1)],
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json(graph))
      .mockResolvedValueOnce(
        Response.json({ graph: cancelledGraph, task: cancelledTask }),
      );
    render(<App />);
    await user.click(
      await screen.findByRole("checkbox", { name: "Hide completed" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Select Launch roadmap",
        hidden: true,
      }),
    );

    await user.click(screen.getByRole("button", { name: "Cancel task" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("button", {
          name: "Select Launch roadmap",
          hidden: true,
        }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("heading", { name: "Select a task or relationship" }),
    ).toBeVisible();
  });

  it("reruns the ELK layout on demand", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("button", {
      name: "Select Launch roadmap",
      hidden: true,
    });
    await waitFor(() => expect(layoutGraphMock).toHaveBeenCalled());
    const initialLayoutCount = layoutGraphMock.mock.calls.length;

    await user.click(screen.getByRole("button", { name: "Relayout" }));

    await waitFor(() =>
      expect(layoutGraphMock.mock.calls.length).toBeGreaterThan(
        initialLayoutCount,
      ),
    );
  });

  it("keeps relayout and task cancellation labels on one line", async () => {
    const user = userEvent.setup();
    render(<App />);

    const relayout = await screen.findByRole("button", { name: "Relayout" });
    await user.click(
      screen.getByRole("button", {
        name: "Select Launch roadmap",
        hidden: true,
      }),
    );
    const cancelTask = screen.getByRole("button", { name: "Cancel task" });

    expect(relayout).toHaveClass("shrink-0", "whitespace-nowrap");
    expect(cancelTask).toHaveClass("shrink-0", "whitespace-nowrap");
  });

  it("loads the graph from the backend API", async () => {
    render(<App />);

    expect(
      await screen.findByRole("button", {
        name: "Select Launch roadmap",
        hidden: true,
      }),
    ).toBeInTheDocument();

    expect(fetch).toHaveBeenCalledWith("/api/graph", expect.any(Object));
  });

  it("creates a task through the API and selects its new graph node", async () => {
    const user = userEvent.setup();
    const createdTask = {
      id: "local:9ca29d0a-c37d-49f7-98ed-4d8379776c69",
      source: { provider: "local" },
      title: "Write release notes",
      description: "Summarize the delivered changes.",
      createdAt: "2026-09-01T08:00:00Z",
      status: "open",
      createdBy: { login: "jann" },
      pullRequests: [],
      duration: 0.5,
      executionType: "internal",
      metadata: {},
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json(graph))
      .mockResolvedValueOnce(
        Response.json(
          {
            task: createdTask,
            graph: { ...graph, tasks: [...graph.tasks, createdTask] },
          },
          { status: 201 },
        ),
      );
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "New task" }));
    await user.type(screen.getByLabelText("Title"), "Write release notes");
    await user.type(
      screen.getByLabelText("Description"),
      "Summarize the delivered changes.",
    );
    await user.clear(screen.getByLabelText("Created by"));
    await user.type(screen.getByLabelText("Created by"), "jann");
    await user.clear(screen.getByLabelText("Duration (days)"));
    await user.type(screen.getByLabelText("Duration (days)"), "0.5");
    await user.click(screen.getByRole("button", { name: "Create task" }));

    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        "/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "Write release notes",
            description: "Summarize the delivered changes.",
            status: "open",
            createdBy: "jann",
            duration: 0.5,
            executionType: "internal",
          }),
        }),
      ),
    );
    expect(
      await screen.findByRole("heading", { name: "Write release notes" }),
    ).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("creates a subtask from the selected task pane", async () => {
    const user = userEvent.setup();
    const [parent] = graph.tasks;
    if (parent === undefined) {
      throw new Error("Parent task fixture is missing");
    }
    const createdTask = {
      ...parent,
      id: "local:release-notes",
      source: { provider: "local" },
      title: "Write release notes",
      description: "",
      createdAt: "2026-09-01T08:00:00Z",
      createdBy: { login: "ghost" },
      duration: 1,
      metadata: {},
    };
    const relationship = {
      id: `subtask-of:${createdTask.id}->${parent.id}`,
      kind: "subtask-of",
      source: createdTask.id,
      target: parent.id,
      metadata: {},
    };
    const createdGraph = {
      ...graph,
      tasks: [...graph.tasks, createdTask],
      relationships: [...graph.relationships, relationship],
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json(graph))
      .mockResolvedValueOnce(
        Response.json(
          { graph: createdGraph, task: createdTask, relationship },
          { status: 201 },
        ),
      );
    render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: "Select Launch roadmap",
        hidden: true,
      }),
    );

    await user.click(screen.getByRole("button", { name: "New sub-task" }));
    expect(
      screen.getByRole("heading", { name: "Create a new sub-task" }),
    ).toBeVisible();
    await user.type(screen.getByLabelText("Title"), "Write release notes");
    await user.click(screen.getByRole("button", { name: "Create sub-task" }));

    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        `/api/tasks/${encodeURIComponent(parent.id)}/subtasks`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "Write release notes",
            description: "",
            status: "open",
            createdBy: "ghost",
            duration: 1,
            executionType: "internal",
          }),
        }),
      ),
    );
    expect(
      await screen.findByRole("heading", { name: "Write release notes" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Select Write release notes",
        hidden: true,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("suggests distinct creators in most-recently-used order", async () => {
    const user = userEvent.setup();
    const graphWithRepeatedCreator = {
      ...graph,
      tasks: [
        ...graph.tasks,
        {
          ...graph.tasks[0],
          id: "github:acme/roadmap#4",
          createdAt: "2026-08-04T10:00:00Z",
        },
      ],
    };
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json(graphWithRepeatedCreator),
    );
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "New task" }));

    const input = screen.getByLabelText("Created by");
    const listId = input.getAttribute("list");
    expect(listId).toBeTruthy();
    expect(
      [...document.querySelectorAll(`#${listId} option`)].map((option) =>
        option.getAttribute("value"),
      ),
    ).toEqual(["octocat", "ghost", "hubot"]);
    expect(input).toHaveValue("octocat");

    await user.clear(input);
    await user.type(input, "a-new-creator");
    expect(input).toHaveValue("a-new-creator");
  });

  it("creates a cancelled task with Control+Enter", async () => {
    const user = userEvent.setup();
    const createdTask = {
      ...graph.tasks[0],
      id: "local:cancelled",
      source: { provider: "local" },
      title: "Cancelled initiative",
      description: "",
      createdAt: "2026-09-01T08:00:00Z",
      status: "cancelled",
      createdBy: { login: "ghost" },
      duration: 1,
      metadata: {},
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json(graph))
      .mockResolvedValueOnce(
        Response.json({
          task: createdTask,
          graph: { ...graph, tasks: [...graph.tasks, createdTask] },
        }),
      );
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "New task" }));
    await user.type(screen.getByLabelText("Title"), "Cancelled initiative");
    await user.selectOptions(screen.getByLabelText("Status"), "cancelled");
    await user.keyboard("{Control>}{Enter}{/Control}");

    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        "/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "Cancelled initiative",
            description: "",
            status: "cancelled",
            createdBy: "ghost",
            duration: 1,
            executionType: "internal",
          }),
        }),
      ),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the task form open when creation fails", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json(graph))
      .mockResolvedValueOnce(
        Response.json({ error: "Could not write task graph" }, { status: 500 }),
      );
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "New task" }));
    await user.type(screen.getByLabelText("Title"), "Write release notes");
    await user.clear(screen.getByLabelText("Created by"));
    await user.type(screen.getByLabelText("Created by"), "jann");
    await user.click(screen.getByRole("button", { name: "Create task" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not write task graph",
    );
    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("confirms task deletion and warns about cascading relationships", async () => {
    const user = userEvent.setup();
    const graphWithoutExternalTask = {
      ...graph,
      tasks: graph.tasks.filter(({ id }) => id !== "github:acme/roadmap#3"),
      relationships: graph.relationships.filter(
        ({ kind }) => kind !== "is-required-for",
      ),
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json(graph))
      .mockResolvedValueOnce(
        Response.json({
          graph: graphWithoutExternalTask,
          deletedTaskId: "github:acme/roadmap#3",
          deletedRelationshipIds: [
            "is-required-for:github:acme/roadmap#3->github:acme/roadmap#2",
          ],
        }),
      );
    render(<App />);

    await user.click(
      await screen.findByRole("button", {
        name: "Select External approval",
        hidden: true,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Delete task" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("1 connected relationship");
    await user.click(
      within(dialog).getByRole("button", { name: "Delete task" }),
    );

    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        `/api/tasks/${encodeURIComponent("github:acme/roadmap#3")}`,
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
    expect(
      screen.queryByRole("heading", { name: "External approval" }),
    ).not.toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await screen.findByRole("button", {
      name: "Select Launch roadmap",
      hidden: true,
    });
    await user.click(screen.getByRole("button", { name: "New task" }));

    expect(await axe(container)).toHaveNoViolations();
  });
});
