import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";

import App from "./App";

expect.extend(toHaveNoViolations);

vi.mock("./graph/layout", () => ({
  layoutGraph: (nodes: readonly { id: string }[]) =>
    Promise.resolve({
      positions: new Map(
        nodes.map(({ id }, index) => [id, { x: index * 320, y: index * 40 }]),
      ),
      width: nodes.length * 320,
      height: 240,
    }),
}));

const graph = {
  schemaVersion: 1,
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
      id: "depends-on:github:acme/roadmap#2->github:acme/roadmap#3",
      kind: "depends-on",
      source: "github:acme/roadmap#2",
      target: "github:acme/roadmap#3",
      metadata: {},
    },
  ],
};

describe("App", () => {
  beforeEach(() => {
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
    expect(screen.getByText(/^external$/iu, { selector: "dd" })).toBeVisible();
    expect(screen.getByText("ghost")).toBeVisible();
  });

  it("reports invalid local JSON without replacing the current graph", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(
      await screen.findByRole("button", {
        name: "Select Launch roadmap",
        hidden: true,
      }),
    ).toBeInTheDocument();

    await user.upload(
      screen.getByLabelText("Open JSON file"),
      new File(["not json"], "broken.json", { type: "application/json" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/valid JSON/iu);
    expect(
      screen.getByRole("button", {
        name: "Select Launch roadmap",
        hidden: true,
      }),
    ).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<App />);

    await screen.findByRole("button", {
      name: "Select Launch roadmap",
      hidden: true,
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});
