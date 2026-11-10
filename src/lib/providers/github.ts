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
    },
    {
      id: "2",
      type: "PullRequestEvent",
      repo: "brandocalricia/CursorBoard",
      summary: "Opened PR: High Dashboard scaffold",
      createdAt: new Date(Date.now() - 7200_000).toISOString(),
    },
    {
      id: "3",
      type: "WatchEvent",
      repo: "vercel/next.js",
      summary: "Starred vercel/next.js",
      createdAt: new Date(Date.now() - 14400_000).toISOString(),
    },
  ],
  pullRequests: [
    {
      id: 1,
      title: "feat: High Dashboard modular command center",
      repo: "brandocalricia/CursorBoard",
      url: "https://github.com/brandocalricia/CursorBoard",
      updatedAt: new Date().toISOString(),
      state: "open",
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
      return {
        id: String(e.id),
        type,
        repo,
        summary: `${type.replace(/Event$/, "")} · ${repo}`,
        createdAt: String(e.created_at ?? new Date().toISOString()),
      };
    }),
    pullRequests: (prsJson.items ?? []).map((pr) => ({
      id: Number(pr.id),
      title: String(pr.title ?? "Untitled"),
      repo: String(pr.repository_url ?? "")
        .replace("https://api.github.com/repos/", ""),
      url: String(pr.html_url ?? "#"),
      updatedAt: String(pr.updated_at ?? new Date().toISOString()),
      state: String(pr.state ?? "open"),
    })),
    sample: false,
  };
}
