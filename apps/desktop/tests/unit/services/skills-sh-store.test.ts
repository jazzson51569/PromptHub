import { describe, expect, it } from "vitest";

import {
  parseSkillsShDetail,
  parseSkillsShLeaderboard,
} from "../../../src/renderer/services/skills-sh-store";
import { buildSkillSourceId } from "@prompthub/shared/utils/skill-identity";

describe("skills-sh-store", () => {
  it("parses leaderboard cards into unique detail entries", () => {
    const html = `
      <main>
        <a href="/vercel-labs/skills/find-skills">
          <span>1</span>
          <span>find-skills</span>
          <span>vercel-labs/skills</span>
          <span>774.9K</span>
        </a>
        <a href="/openai/codex/api-design-review">
          <span>2</span>
          <span>api-design-review</span>
          <span>openai/codex</span>
          <span>193.2K</span>
        </a>
        <a href="/vercel-labs/skills/find-skills">
          <span>1</span>
          <span>find-skills</span>
          <span>vercel-labs/skills</span>
          <span>774.9K</span>
        </a>
      </main>
    `;

    expect(parseSkillsShLeaderboard(html, { limit: 10 })).toEqual([
      expect.objectContaining({
        owner: "vercel-labs",
        repo: "skills",
        skillName: "find-skills",
        weeklyInstalls: "774.9K",
      }),
      expect.objectContaining({
        owner: "openai",
        repo: "codex",
        skillName: "api-design-review",
        weeklyInstalls: "193.2K",
      }),
    ]);
  });

  it("maps detail page content into a registry skill", () => {
    const html = `
      <article>
        <h1>find-skills</h1>
        <h2>Summary</h2>
        <p>Use this skill whenever the user asks how to find or discover skills.</p>
        <h2>SKILL.md</h2>
        <pre><code>---
name: find-skills
description: Discover relevant skills and recommend the best next step.
tags: [search, discovery]
---

# Finding Skills

Use this skill to look up the right capability for a task.
        </code></pre>
        <h2>Weekly Installs</h2>
        <p>774.9K</p>
        <h2>Repository</h2>
        <p>vercel-labs/skills</p>
        <h2>GitHub Stars</h2>
        <p>8.3K</p>
        <h2>Installed on</h2>
        <p>opencode 689.9K</p>
        <p>codex 79.4K</p>
        <p>claude 5.7K</p>
        <h2>Security audits</h2>
        <p>No auditors found</p>
      </article>
    `;

    const skill = parseSkillsShDetail(html, {
      owner: "vercel-labs",
      repo: "skills",
      skillName: "find-skills",
      detailPath: "/vercel-labs/skills/find-skills",
      detailUrl: "https://skills.sh/vercel-labs/skills/find-skills",
      weeklyInstalls: "774.9K",
    });

    expect(skill).toEqual(
      expect.objectContaining({
        slug: "vercel-labs-skills-find-skills",
        name: "find-skills",
        install_name: "find-skills",
        source_id: buildSkillSourceId({
          sourceType: "skills-sh",
          sourceUrl: "https://skills.sh",
          skillPath: "/vercel-labs/skills/find-skills",
        }),
        source_label: "skills.sh",
        canonical_skill_path: "vercel-labs/skills/find-skills",
        description:
          "Use this skill whenever the user asks how to find or discover skills.",
        source_url: "https://github.com/vercel-labs/skills",
        store_url: "https://skills.sh/vercel-labs/skills/find-skills",
        weekly_installs: "774.9K",
        github_stars: "8.3K",
        compatibility: ["opencode", "codex", "claude"],
        tags: ["search", "discovery"],
        installed_on: ["opencode", "codex", "claude"],
        security_audits: ["No auditors found"],
      }),
    );
    expect(skill?.content).toContain("# Finding Skills");
  });

  it("generates distinct source ids for different skills with the same display name", () => {
    const html = `
      <article>
        <h2>SKILL.md</h2>
        <pre><code>---
name: writer
description: Writer helper.
---

# Writer
        </code></pre>
      </article>
    `;

    const first = parseSkillsShDetail(html, {
      owner: "alpha",
      repo: "skills",
      skillName: "writer",
      detailPath: "/alpha/skills/writer",
      detailUrl: "https://skills.sh/alpha/skills/writer",
    });
    const second = parseSkillsShDetail(html, {
      owner: "beta",
      repo: "skills",
      skillName: "writer",
      detailPath: "/beta/skills/writer",
      detailUrl: "https://skills.sh/beta/skills/writer",
    });

    expect(first?.name).toBe("writer");
    expect(second?.name).toBe("writer");
    expect(first?.source_id).toBeDefined();
    expect(second?.source_id).toBeDefined();
    expect(first?.source_id).not.toBe(second?.source_id);
  });

  it("falls back to the default compatibility list when Installed on is absent", () => {
    const html = `
      <article>
        <h1>find-skills</h1>
        <h2>Summary</h2>
        <p>Use this skill whenever the user asks how to find or discover skills.</p>
        <h2>SKILL.md</h2>
        <pre><code>---
name: find-skills
description: Discover relevant skills and recommend the best next step.
tags: [search, discovery]
---

# Finding Skills
        </code></pre>
      </article>
    `;

    const skill = parseSkillsShDetail(html, {
      owner: "vercel-labs",
      repo: "skills",
      skillName: "find-skills",
      detailPath: "/vercel-labs/skills/find-skills",
      detailUrl: "https://skills.sh/vercel-labs/skills/find-skills",
    });

    expect(skill?.compatibility).toEqual([
      "claude",
      "codex",
      "cursor",
      "opencode",
      "antigravity",
    ]);
  });
});
