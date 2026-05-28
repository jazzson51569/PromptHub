import { describe, expect, it } from "vitest";

import {
  isLikelyLocalSource,
  isSupportedGitRepoSource,
  normalizeLocalSourcePath,
  validateStoreSourceInput,
} from "../../../src/renderer/services/skill-store-source";

describe("skill-store-source", () => {
  it("accepts local directory paths for local-dir and git-repo sources", () => {
    expect(validateStoreSourceInput("~/Projects/skills", "local-dir")).toBe(
      "~/Projects/skills",
    );
    expect(validateStoreSourceInput("~/Projects/skills", "git-repo")).toBe(
      "~/Projects/skills",
    );
  });

  it("normalizes file URLs into local filesystem paths", () => {
    expect(normalizeLocalSourcePath("file:///Users/demo/skills")).toBe(
      "/Users/demo/skills",
    );
  });

  it("accepts hosted and self-hosted git repo URLs plus local paths", () => {
    expect(isSupportedGitRepoSource("https://github.com/anthropics/skills")).toBe(
      true,
    );
    expect(isSupportedGitRepoSource("https://gitea.example.com/icelemon/skills")).toBe(
      true,
    );
    expect(isSupportedGitRepoSource("git@gitea.example.com:icelemon/skills.git")).toBe(
      true,
    );
    expect(isSupportedGitRepoSource("~/Projects/my-skill-repo")).toBe(true);
    expect(isLikelyLocalSource("file:///Users/demo/skills")).toBe(true);
    expect(isSupportedGitRepoSource("https://gitlab.com/demo/skills")).toBe(true);
  });
});
