"use client";

import { useCallback, useEffect, useState } from "react";
import { StickyNote, Trash2 } from "lucide-react";
import { WidgetShell } from "@/components/dashboard/WidgetShell";
import type { NoteItem } from "@/lib/types";

export function NotesWidget() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notes", { cache: "no-store" });
      const json = (await res.json()) as { notes: NoteItem[] };
      setNotes(json.notes);
      if (!activeId && json.notes[0]) {
        setActiveId(json.notes[0].id);
        setTitle(json.notes[0].title);
        setBody(json.notes[0].body);
      }
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: activeId ?? undefined, title, body }),
      });
      const note = (await res.json()) as NoteItem;
      setActiveId(note.id);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function createNew() {
    setActiveId(null);
    setTitle("Untitled");
    setBody("");
  }

  async function remove(id: string) {
    await fetch(`/api/notes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (activeId === id) {
      setActiveId(null);
      setTitle("");
      setBody("");
    }
    void load();
  }

  return (
    <WidgetShell
      title="Scratch notes"
      description="Local SQLite · stays on this machine"
      loading={loading}
    >
      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <div className="space-y-1">
          <button
            type="button"
            className="mb-1 w-full rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground hover:border-[var(--accent)] hover:text-foreground"
            onClick={() => void createNew()}
          >
            + New note
          </button>
          {notes.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`flex w-full items-center gap-1 truncate rounded-md px-2 py-1.5 text-left text-xs ${
                activeId === n.id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60"
              }`}
              onClick={() => {
                setActiveId(n.id);
                setTitle(n.title);
                setBody(n.body);
              }}
            >
              <StickyNote className="h-3 w-3 shrink-0" />
              <span className="truncate">{n.title}</span>
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <input
            className="h-8 w-full rounded-md border border-border bg-muted px-2 text-sm font-semibold outline-none focus:border-[var(--accent)]"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
          />
          <textarea
            className="min-h-[120px] w-full resize-y rounded-md border border-border bg-muted p-2 text-sm outline-none focus:border-[var(--accent)]"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Scratch ideas, TODOs, exam reminders…"
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-accent h-8 rounded-md px-3 text-xs"
              onClick={() => void save()}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {activeId ? (
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground hover:text-[var(--danger)]"
                onClick={() => void remove(activeId)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </WidgetShell>
  );
}
