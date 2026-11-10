"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ChevronRight, GitPullRequest } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { WidgetShell } from "@/components/dashboard/WidgetShell";
import { DetailSheet } from "@/components/dashboard/DetailSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { SparkBars } from "@/components/ui/MiniCharts";
import type { DetailItem, GitHubPayload } from "@/lib/types";

export function GitHubWidget() {
  const [data, setData] = useState<GitHubPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<DetailItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/github", { cache: "no-store" });
      if (!res.ok) throw new Error("Couldn’t load GitHub");
      setData((await res.json()) as GitHubPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activitySeries = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const e of data?.events ?? []) {
      const day = e.createdAt.slice(0, 10);
      buckets.set(day, (buckets.get(day) ?? 0) + 1);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([t, v]) => ({ t: t.slice(5), v }));
  }, [data]);

  return (
    <>
      <WidgetShell
        title="GitHub"
        description={data ? `@${data.user} · click a row for detail` : "Activity & open PRs"}
        loading={loading}
        error={error}
        onRetry={() => void load()}
        sample={data?.sample}
        empty={!loading && !error && !data?.events.length && !data?.pullRequests.length}
        emptyNode={
          <EmptyState
            illustration="connection"
            title="No recent GitHub signal"
            body="Add GITHUB_TOKEN to .env.local, or wait for activity on your account."
          />
        }
      >
        <div className="space-y-5">
          {activitySeries.length > 1 ? (
            <div className="rounded-2xl bg-muted/45 px-3 py-2.5">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Events by day
              </p>
              <SparkBars data={activitySeries} height={84} />
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Activity className="h-3.5 w-3.5" /> Activity
              </div>
              <ul className="space-y-2">
                {(data?.events ?? []).slice(0, 5).map((e) => (
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
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
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
                          meta: [
                            pr.state,
                            formatDistanceToNow(new Date(pr.updatedAt), { addSuffix: true }),
                          ],
                          bodyText:
                            pr.body?.trim() || "No pull request description was provided.",
                          linkUrl: pr.url,
                          linkLabel: "Open pull request",
                        })
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-snug text-foreground">
                            {pr.title}
                          </p>
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
        </div>
      </WidgetShell>
      <DetailSheet item={detail} onClose={() => setDetail(null)} />
    </>
  );
}
