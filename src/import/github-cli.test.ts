import { describe, expect, it } from "vitest";

import { buildGhArguments, parseImportArguments } from "./github-cli";

describe("parseImportArguments", () => {
  it("uses the public sample path by default", () => {
    expect(parseImportArguments(["acme/roadmap"])).toEqual({
      repository: "acme/roadmap",
      outputPath: "public/tasks.json",
    });
  });

  it("accepts an explicit output path", () => {
    expect(
      parseImportArguments(["acme/roadmap", "project/tasks.json"]),
    ).toEqual({
      repository: "acme/roadmap",
      outputPath: "project/tasks.json",
    });
  });

  it.each([
    { label: "empty", commandArguments: [] },
    { label: "invalid repository", commandArguments: ["not-a-repository"] },
    { label: "too many", commandArguments: ["a/b", "out.json", "extra"] },
  ])("rejects $label arguments", ({ commandArguments }) => {
    expect(() => parseImportArguments(commandArguments)).toThrow(/usage/iu);
  });
});

describe("buildGhArguments", () => {
  it("requests all GitHub-owned fields without shell interpolation", () => {
    const commandArguments = buildGhArguments("acme/roadmap");

    expect(commandArguments).toContain("acme/roadmap");
    expect(commandArguments.join(" ")).toContain("blockedBy");
    expect(commandArguments.join(" ")).toContain("subIssues");
    expect(commandArguments.join(" ")).toContain(
      "closedByPullRequestsReferences",
    );
  });
});
