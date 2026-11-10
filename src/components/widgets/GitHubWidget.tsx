"use client";

import { useEffect, useState } from "react";
import { Activity, ChevronRight, GitPullRequest } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { WidgetShell } from "@/components/dashboard/WidgetShell";
import { DetailSheet } from "@/components/dashboard/DetailSheet";
import type { DetailItem, GitHubPayload } from "@/lib/types";

export function GitHubWidget() {
  const [data, setData] = useState<GitHubPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<DetailItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/github", { cache: "no-store" });
        if (!res.ok) throw new Error("Couldn’t load GitHub");
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
    <>
      <WidgetShell
        title="GitHub"
        description={data ? `@${data.user} · click a row for detail` : "Activity & open PRs"}
        loading={loading}
        error={error}
        sample={data?.sample}
        empty={!loading && !error && !data?.events.length && !data?.pullRequests.length}
        emptyMessage="No recent GitHub activity"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Activity className="h-3.5 w-3.5" /> Activity
            </div>
            <ul className="space-y-2">
              {(data?.events ?? []).slice(0, 6).map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className="row-item group"
                    onClick={() =>
                      setDetail({
                        id: e.id,
                        source: "github",
                        title: e.summary,
                        subtitle: e.repo,
                        meta: [
                          e.type.replace(/Event$/, ""),
                          formatDistanceToNow(new Date(e.createdAt), { addSuffix: true }),
                        ],
                        bodyText:
                          e.body ||
                          `${e.summary}\n\nRepository: ${e.repo}\nWhen: ${new Date(e.createdAt).toLocaleString()}`,
                        linkUrl: e.url,
                        linkLabel: "Open on GitHub",
                      })
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm leading-snug text-foreground">{e.summary}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {e.repo} ·{" "}
                          {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-40 group-hover:opacity-100" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <GitPullRequest className="h-3.5 w-3.5" /> Open PRs
            </div>
            <ul className="space-y-2">
              {(data?.pullRequests ?? []).map((pr) => (
                <li key={pr.id}>
                  <button
                    type="button"
                    className="row-item group"
                    onClick={() =>
                      setDetail({
                        id: String(pr.id),
                        source: "github",
                        title: pr.title,
                        subtitle: pr.repo,
                        meta: [pr.state, formatDistanceToNow(new Date(pr.updatedAt), { addSuffix: true })],
                        bodyText:
                          pr.body?.trim() ||
                          "No pull request description was provided.",
                        linkUrl: pr.url,
                        linkLabel: "Open pull request",
                      })
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-snug text-foreground">{pr.title}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{pr.repo}</p>
                      </div>
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-40 group-hover:opacity-100" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </WidgetShell>
      <DetailSheet item={detail} onClose={() => setDetail(null)} />
    </>
  );
}
