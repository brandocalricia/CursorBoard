"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, Plus, Trash2 } from "lucide-react";
import { WidgetShell } from "@/components/dashboard/WidgetShell";
import { EmptyState } from "@/components/ui/EmptyState";
import type { QuickLink } from "@/lib/types";

export function LinksWidget() {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/links", { cache: "no-store" });
      if (!res.ok) throw new Error("Couldn’t load links");
      const json = (await res.json()) as { links: QuickLink[] };
      setLinks(json.links);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, url }),
    });
    if (!res.ok) return;
    setTitle("");
    setUrl("");
    void load();
  }

  async function remove(id: string) {
    await fetch(`/api/links?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    void load();
  }

  return (
    <WidgetShell
      title="Quick links"
      description="Exact bookmarks — opens the URL you save"
      loading={loading}
      error={error}
      onRetry={() => void load()}
    >
      <form onSubmit={addLink} className="mb-3 flex flex-col gap-2">
        <input
          className="h-8 rounded-md border border-border bg-muted px-2 text-sm outline-none focus:border-[var(--accent)]"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <div className="flex gap-2">
          <input
            className="h-8 min-w-0 flex-1 rounded-md border border-border bg-muted px-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <button type="submit" className="btn-accent inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </form>
      {!links.length ? (
        <EmptyState
          illustration="connection"
          title="No bookmarks yet"
          body="Add course portals, docs, or tools. Each link opens exactly that page."
        />
      ) : (
        <ul className="space-y-1.5">
          {links.map((l) => (
            <li key={l.id} className="flex items-center gap-2 rounded-lg bg-muted/50 px-2 py-1.5">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-sm font-medium hover:text-[var(--accent)]"
                title={l.url}
              >
                {l.title}
              </a>
              <button
                type="button"
                aria-label={`Delete ${l.title}`}
                className="rounded p-1 text-muted-foreground hover:text-[var(--danger)]"
                onClick={() => void remove(l.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  );
}
