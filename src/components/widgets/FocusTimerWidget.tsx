"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { WidgetShell } from "@/components/dashboard/WidgetShell";

const PRESETS = [
  { label: "25m", sec: 25 * 60 },
  { label: "50m", sec: 50 * 60 },
  { label: "5m", sec: 5 * 60 },
];

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FocusTimerWidget() {
  const [total, setTotal] = useState(25 * 60);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const endAt = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    endAt.current = Date.now() + left * 1000;
    const id = window.setInterval(() => {
      const remain = Math.max(0, Math.ceil(((endAt.current ?? Date.now()) - Date.now()) / 1000));
      setLeft(remain);
      if (remain <= 0) {
        setRunning(false);
        endAt.current = null;
        try {
          if (Notification.permission === "granted") {
            new Notification("Focus session done", {
              body: "Time’s up — take a short break.",
            });
          }
        } catch {
          /* ignore */
        }
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = useMemo(() => (total ? ((total - left) / total) * 100 : 0), [left, total]);

  async function start() {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        /* ignore */
      }
    }
    setRunning(true);
  }

  return (
    <WidgetShell title="Focus timer" description="Study countdown · local only">
      <div className="flex flex-col items-center gap-4 py-2">
        <p
          className={`stat-value text-5xl font-semibold tracking-tight text-[var(--accent)] ${
            running ? "shimmer" : ""
          }`}
        >
          {fmt(left)}
        </p>
        <div className="meter w-full max-w-[220px]">
          <span style={{ width: `${pct}%` }} />
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:border-[var(--accent)] hover:text-foreground"
              onClick={() => {
                setRunning(false);
                setTotal(p.sec);
                setLeft(p.sec);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {running ? (
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm"
              onClick={() => setRunning(false)}
            >
              <Pause className="h-4 w-4" /> Pause
            </button>
          ) : (
            <button
              type="button"
              className="btn-accent inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm"
              onClick={() => void start()}
            >
              <Play className="h-4 w-4" /> Start
            </button>
          )}
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm text-muted-foreground"
            onClick={() => {
              setRunning(false);
              setLeft(total);
            }}
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>
    </WidgetShell>
  );
}
