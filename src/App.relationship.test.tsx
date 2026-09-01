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
import type { ProjectedRelationship } from "./graph/project-visible-graph";

expect.extend(toHaveNoViolations);

const relationshipId = "is-required-for:prerequisite->dependent";
const projectedRelationship: ProjectedRelationship = {
  id: "projected:is-required-for:prerequisite->dependent",
  kind: "is-required-for",
  source: "prerequisite",
  target: "dependent",
  relationshipIds: [relationshipId],
  aggregatedCount: 1,
};

vi.mock("./components/TaskGraph", () => ({
  TaskGraph: ({
    onSelectRelationship,
  }: {
    onSelectRelationship?: (relationship: ProjectedRelationship) => void;
  }) => (
    <button
      type="button"
      onClick={() => onSelectRelationship?.(projectedRelationship)}
    >
      Select required-for edge
    </button>
  ),
}));

const graph = {
  schemaVersion: 2,
  project: { name: "Relationship test" },
  tasks: [
    {
      id: "dependent",
      source: { provider: "local" },
      title: "Ship release",
      description: "",
      createdAt: "2026-09-01T10:00:00Z",
      status: "open",
      createdBy: { login: "jann" },
      pullRequests: [],
      duration: 1,
      executionType: "internal",
      metadata: {},
    },
    {
      id: "prerequisite",
      source: { provider: "local" },
      title: "Approve release",
      description: "",
      createdAt: "2026-09-01T09:00:00Z",
      status: "open",
      createdBy: { login: "jann" },
      pullRequests: [],
      duration: 1,
      executionType: "external",
      metadata: {},
    },
  ],
  relationships: [
    {
      id: relationshipId,
      kind: "is-required-for",
      source: "prerequisite",
      target: "dependent",
      metadata: { reason: "Approval gate" },
    },
  ],
};

describe("App relationship selection", () => {
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

  it("shows a selected edge's type, endpoints, and metadata", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      await screen.findByRole("button", { name: "Select required-for edge" }),
    );

    expect(
      screen.getByRole("heading", { name: "Is required for" }),
    ).toBeVisible();
    expect(screen.getByText("Approval gate")).toBeVisible();
    expect(screen.getByText("Ship release")).toBeVisible();
    expect(screen.getByText("Approve release")).toBeVisible();
  });

  it("confirms and deletes every relationship represented by an edge", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json(graph))
      .mockResolvedValueOnce(
        Response.json({
          graph: { ...graph, relationships: [] },
          deletedRelationshipIds: [relationshipId],
        }),
      );
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Select required-for edge" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Delete relationship" }),
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Delete this relationship");
    await user.click(
      within(dialog).getByRole("button", { name: "Delete relationship" }),
    );

    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        "/api/relationships",
        expect.objectContaining({
          method: "DELETE",
          body: JSON.stringify({ ids: [relationshipId] }),
        }),
      ),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Is required for" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the confirmation open and reports a stale deletion", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json(graph))
      .mockResolvedValueOnce(
        Response.json(
          { error: `Relationship not found: ${relationshipId}` },
          { status: 404 },
        ),
      );
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Select required-for edge" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Delete relationship" }),
    );
    const dialog = screen.getByRole("dialog");

    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toHaveFocus();
    await user.click(
      within(dialog).getByRole("button", { name: "Delete relationship" }),
    );

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      `Relationship not found: ${relationshipId}`,
    );
    expect(dialog).toBeVisible();
  });

  it("has no detectable accessibility violations in edge deletion", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Select required-for edge" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Delete relationship" }),
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
