export interface ParsedGitRepo {
  host: string;
  owner: string;
  repo: string;
  repositoryUrl: string;
  cloneUrl: string;
  protocol: "https" | "ssh";
}

function isLikelyRepoOwner(value: string): boolean {
  return /^[A-Za-z0-9_.-]+$/.test(value) && /[A-Za-z_-]/.test(value);
}

function isLikelyRepoName(value: string): boolean {
  return /^[A-Za-z0-9_.-]+$/.test(value) && /[A-Za-z_-]/.test(value);
}

export function parseGitRepo(url: string): ParsedGitRepo | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  const sshMatch = trimmed.match(
    /^git@([^:]+):([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/,
  );
  if (sshMatch) {
    if (!isLikelyRepoOwner(sshMatch[2]) || !isLikelyRepoName(sshMatch[3])) {
      return null;
    }
    return {
      host: sshMatch[1].toLowerCase(),
      owner: sshMatch[2],
      repo: sshMatch[3],
      repositoryUrl: `https://${sshMatch[1]}/${sshMatch[2]}/${sshMatch[3]}`,
      cloneUrl: trimmed,
      protocol: "ssh",
    };
  }

  const httpsMatch = trimmed.match(
    /^https?:\/\/([^/]+)\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:\/tree\/[^/]+(?:\/.*)?)?\/?$/,
  );
  if (httpsMatch) {
    if (!isLikelyRepoOwner(httpsMatch[2]) || !isLikelyRepoName(httpsMatch[3])) {
      return null;
    }
    return {
      host: httpsMatch[1].toLowerCase(),
      owner: httpsMatch[2],
      repo: httpsMatch[3],
      repositoryUrl: `https://${httpsMatch[1]}/${httpsMatch[2]}/${httpsMatch[3]}`,
      cloneUrl: trimmed,
      protocol: "https",
    };
  }

  return null;
}

export function isGitHubHost(host: string): boolean {
  return host.toLowerCase() === "github.com";
}
