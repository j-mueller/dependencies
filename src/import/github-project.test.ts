import { describe, expect, it } from "vitest";

import { parseGithubProject, parseGithubProjectItems } from "./github-project";

describe("parseGithubProject", () => {
  it("maps project identity", () => {
    expect(
      parseGithubProject({
        number: 4,
        title: "Cross Chain",
        url: "https://github.com/orgs/realfi-co/projects/4",
      }),
    ).toEqual({
      number: 4,
      title: "Cross Chain",
      url: "https://github.com/orgs/realfi-co/projects/4",
    });
  });
});

describe("parseGithubProjectItems", () => {
  it("groups issue numbers by repository and ignores draft items", () => {
    expect(
      parseGithubProjectItems({
        totalCount: 3,
        items: [
          {
            content: {
              type: "Issue",
              number: 36,
              repository: "realfi-co/realfi-cross-chain-spine",
              url: "https://github.com/realfi-co/realfi-cross-chain-spine/issues/36",
            },
          },
          {
            content: {
              type: "Issue",
              number: 1531,
              repository: "realfi-co/realfi",
              url: "https://github.com/realfi-co/realfi/issues/1531",
            },
          },
          { type: "DraftIssue", title: "Unlinked planning note" },
        ],
      }),
    ).toEqual([
      { repository: "realfi-co/realfi", issueNumbers: [1531] },
      {
        repository: "realfi-co/realfi-cross-chain-spine",
        issueNumbers: [36],
      },
    ]);
  });

  it("rejects malformed issue membership", () => {
    expect(() =>
      parseGithubProjectItems({
        totalCount: 1,
        items: [
          {
            content: {
              type: "Issue",
              number: "thirty-six",
              repository: "realfi-co/realfi-cross-chain-spine",
            },
          },
        ],
      }),
    ).toThrow();
  });
});
