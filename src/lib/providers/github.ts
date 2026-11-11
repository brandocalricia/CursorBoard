import type { GitHubPayload } from "../types";

const SAMPLE: GitHubPayload = {
  user: "brandocalricia",
  events: [
    {
      id: "1",
      type: "PushEvent",
      repo: "brandocalricia/CursorBoard",
      summary: "Pushed 3 commits to main",
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
      url: "https://github.com/brandocalricia/CursorBoard",
      body: "Latest push updates the modular widget grid and host metrics collector.",
    },
    {
      id: "2",
      type: "PullRequestEvent",
      repo: "brandocalricia/CursorBoard",
      summary: "Opened PR: High Dashboard scaffold",
      createdAt: new Date(Date.now() - 7200_000).toISOString(),
      url: "https://github.com/brandocalricia/CursorBoard/pull/1",
      body: "Scaffolds the local command center with Canvas, GitHub, and host panels.",
    },
    {
      id: "3",
      type: "WatchEvent",
      repo: "vercel/next.js",
      summary: "Starred vercel/next.js",
      createdAt: new Date(Date.now() - 14400_000).toISOString(),
      url: "https://github.com/vercel/next.js",
      body: "Starred the Next.js repository.",
    },
  ],
  pullRequests: [
    {
      id: 1,
      title: "feat: High Dashboard modular command center",
      repo: "brandocalricia/CursorBoard",
      url: "https://github.com/brandocalricia/CursorBoard/pull/1",
      updatedAt: new Date().toISOString(),
      state: "open",
      body: "Local-first personal command center with GitHub, Canvas detail sheets, host metrics, and an internet speed test.",
    },
  ],
  sample: true,
};

export async function fetchGitHub(): Promise<GitHubPayload> {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) return SAMPLE;

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "high-dashboard",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const userRes = await fetch("https://api.github.com/user", { headers, cache: "no-store" });
  if (!userRes.ok) return SAMPLE;
  const user = (await userRes.json()) as { login: string };

  const [eventsRes, prsRes] = await Promise.all([
    fetch(`https://api.github.com/users/${user.login}/events?per_page=12`, {
      headers,
      cache: "no-store",
    }),
    fetch(
      `https://api.github.com/search/issues?q=author:${user.login}+type:pr+state:open&per_page=8`,
      { headers, cache: "no-store" },
    ),
  ]);

  const eventsJson = eventsRes.ok
    ? ((await eventsRes.json()) as Array<Record<string, unknown>>)
    : [];
  const prsJson = prsRes.ok
    ? ((await prsRes.json()) as { items: Array<Record<string, unknown>> })
    : { items: [] };

  return {
    user: user.login,
    events: eventsJson.slice(0, 10).map((e) => {
      const repo = (e.repo as { name?: string } | undefined)?.name ?? "unknown";
      const type = String(e.type ?? "Event");
      const payload = (e.payload ?? {}) as Record<string, unknown>;
      const pr = payload.pull_request as {
        html_url?: string;
        number?: number;
      } | undefined;
      const issue = payload.issue as { html_url?: string; number?: number } | undefined;
      const comment = payload.comment as { html_url?: string } | undefined;
      const release = payload.release as { html_url?: string } | undefined;
      const commits = payload.commits as Array<{ url?: string; sha?: string }> | undefined;
      const sha = typeof payload.head === "string" ? payload.head : undefined;
      const url =
        pr?.html_url ||
        issue?.html_url ||
        comment?.html_url ||
        release?.html_url ||
        (commits?.[0]?.sha && repo !== "unknown"
          ? `https://github.com/${repo}/commit/${commits[0].sha}`
          : undefined) ||
        commits?.[0]?.url
          ?.replace("api.github.com/repos", "github.com")
          .replace("/commits/", "/commit/") ||
        (sha && repo !== "unknown" ? `https://github.com/${repo}/commit/${sha}` : undefined) ||
        (typeof payload.ref === "string" && repo !== "unknown"
          ? `https://github.com/${repo}/tree/${String(payload.ref).replace(/^refs\/heads\//, "")}`
          : undefined) ||
        (repo !== "unknown" ? `https://github.com/${repo}` : "https://github.com");
      return {
        id: String(e.id),
        type,
        repo,
        summary: `${type.replace(/Event$/, "")} · ${repo}`,
        createdAt: String(e.created_at ?? new Date().toISOString()),
        url,
        body: `${type.replace(/Event$/, "")} on ${repo}`,
      };
    }),
    pullRequests: (prsJson.items ?? []).map((pr) => ({
      id: Number(pr.id),
      title: String(pr.title ?? "Untitled"),
      repo: String(pr.repository_url ?? "")
        .replace("https://api.github.com/repos/", ""),
      url: String(pr.html_url ?? "https://github.com"),
      updatedAt: String(pr.updated_at ?? new Date().toISOString()),
      state: String(pr.state ?? "open"),
      body: String(pr.body ?? "").slice(0, 4000) || undefined,
    })),
    sample: false,
  };
}
