import { describe, expect, it } from "vitest";

import fixture from "./fixtures/issues.json";
import {
  buildIssueQueryArguments,
  parseGithubIssueNumbers,
  parseGithubIssueQuery,
} from "./github-graphql";

function connection(nodes: readonly unknown[], totalCount = nodes.length) {
  return { nodes, totalCount };
}

const [issue] = fixture;
if (issue === undefined) {
  throw new Error("Issue fixture is missing");
}

const graphQlIssue = {
  ...issue,
  blockedBy: connection(issue.blockedBy),
  blocking: connection(issue.blocking),
  subIssues: connection(issue.subIssues),
  closedByPullRequestsReferences: connection(
    issue.closedByPullRequestsReferences,
  ),
};

describe("buildIssueQueryArguments", () => {
  it("builds a bounded aliased GraphQL query", () => {
    const commandArguments = buildIssueQueryArguments("acme/roadmap", [1, 3]);
    const command = commandArguments.join(" ");

    expect(commandArguments.slice(0, 2)).toEqual(["api", "graphql"]);
    expect(command).toContain("owner=acme");
    expect(command).toContain("name=roadmap");
    expect(command).toContain("issue_1: issue(number: 1)");
    expect(command).toContain("issue_3: issue(number: 3)");
    expect(command).toContain("blockedBy(first: 100)");
    expect(command).toContain("closedByPullRequestsReferences(first: 100)");
  });
});

describe("parseGithubIssueNumbers", () => {
  it("validates repository issue discovery output", () => {
    expect(parseGithubIssueNumbers([{ number: 3 }, { number: 1 }])).toEqual([
      1, 3,
    ]);
  });
});

describe("parseGithubIssueQuery", () => {
  it("flattens GraphQL connections into importer input", () => {
    expect(
      parseGithubIssueQuery({
        data: { repository: { issue_1: graphQlIssue } },
      }),
    ).toEqual([issue]);
  });

  it("rejects truncated relationship connections", () => {
    expect(() =>
      parseGithubIssueQuery({
        data: {
          repository: {
            issue_1: {
              ...graphQlIssue,
              blocking: connection(issue.blocking, issue.blocking.length + 1),
            },
          },
        },
      }),
    ).toThrow(/truncated/iu);
  });
});
