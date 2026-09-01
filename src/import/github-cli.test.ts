import { describe, expect, it } from "vitest";

import {
  buildGhArguments,
  buildProjectItemArguments,
  buildProjectViewArguments,
  parseImportArguments,
} from "./github-cli";

describe("parseImportArguments", () => {
  it("uses the public sample path by default", () => {
    expect(parseImportArguments(["acme/roadmap"])).toEqual({
      target: { kind: "repository", repository: "acme/roadmap" },
      outputPath: "public/tasks.json",
    });
  });

  it("accepts an explicit output path", () => {
    expect(
      parseImportArguments(["acme/roadmap", "project/tasks.json"]),
    ).toEqual({
      target: { kind: "repository", repository: "acme/roadmap" },
      outputPath: "project/tasks.json",
    });
  });

  it("accepts an organization project target", () => {
    expect(parseImportArguments(["--project", "realfi-co/4"])).toEqual({
      target: { kind: "project", owner: "realfi-co", number: 4 },
      outputPath: "public/tasks.json",
    });
  });

  it.each([
    { label: "empty", commandArguments: [] },
    { label: "invalid repository", commandArguments: ["not-a-repository"] },
    { label: "too many", commandArguments: ["a/b", "out.json", "extra"] },
    { label: "missing project", commandArguments: ["--project"] },
    { label: "invalid project number", commandArguments: ["--project", "a/0"] },
  ])("rejects $label arguments", ({ commandArguments }) => {
    expect(() => parseImportArguments(commandArguments)).toThrow(/usage/iu);
  });
});

describe("project CLI arguments", () => {
  const target = { kind: "project", owner: "realfi-co", number: 4 } as const;

  it("builds project view arguments", () => {
    expect(buildProjectViewArguments(target)).toEqual([
      "project",
      "view",
      "4",
      "--owner",
      "realfi-co",
      "--format",
      "json",
    ]);
  });

  it("builds project item arguments with a bounded process call", () => {
    expect(buildProjectItemArguments(target)).toEqual([
      "project",
      "item-list",
      "4",
      "--owner",
      "realfi-co",
      "--limit",
      "10000",
      "--format",
      "json",
    ]);
  });
});

describe("buildGhArguments", () => {
  it("requests issue numbers for repository discovery", () => {
    const commandArguments = buildGhArguments("acme/roadmap");

    expect(commandArguments).toContain("acme/roadmap");
    expect(commandArguments.at(-1)).toBe("number");
  });
});
