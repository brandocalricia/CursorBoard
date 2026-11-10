"use client";

import { useEffect, useState } from "react";
import { GitPullRequest, Activity } from "lucide-react";
import { WidgetShell } from "@/components/dashboard/WidgetShell";
import type { GitHubPayload } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

export function GitHubWidget() {
  const [data, setData] = useState<GitHubPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/github", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load GitHub");
        const json = (await res.json()) as GitHubPayload;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WidgetShell
      title="GitHub"
      description={data ? `@${data.user}` : "Activity & open PRs"}
      loading={loading}
      error={error}
      sample={data?.sample}
      empty={!loading && !error && !data?.events.length && !data?.pullRequests.length}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Activity className="h-3.5 w-3.5" /> Activity
          </div>
          <ul className="space-y-2">
            {(data?.events ?? []).slice(0, 6).map((e) => (
              <li
                key={e.id}
                className="rounded-lg bg-muted/60 px-3 py-2 transition-colors hover:bg-muted"
              >
                <p className="text-sm text-foreground">{e.summary}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <GitPullRequest className="h-3.5 w-3.5" /> Open PRs
          </div>
          <ul className="space-y-2">
            {(data?.pullRequests ?? []).map((pr) => (
              <li key={pr.id}>
                <a
                  href={pr.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg bg-muted/60 px-3 py-2 transition-colors hover:bg-muted"
                >
                  <p className="text-sm text-foreground">{pr.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {pr.repo}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </WidgetShell>
  );
}
