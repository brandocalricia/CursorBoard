import { NextResponse } from "next/server";
import { sqlAll, sqlGet } from "@/lib/db";
import { isComposioConfigured } from "@/lib/composio";
import { spawn } from "node:child_process";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Pulse = {
  id: string;
  label: string;
  schedule: string;
  script: string;
  lastKind?: string;
  lastTitle?: string;
  lastAt?: string | null;
  help: string;
};

function lastDigest(kinds: string[]) {
  const placeholders = kinds.map(() => "?").join(",");
  return sqlGet<{ title: string; kind: string; created_at: string }>(
    `SELECT title, kind, created_at FROM digests
     WHERE kind IN (${placeholders})
     ORDER BY id DESC LIMIT 1`,
    kinds,
  );
}

function lastSnapshot(source: string, kind?: string) {
  if (kind) {
    return sqlGet<{ captured_at: string }>(
      `SELECT captured_at FROM metric_snapshots
       WHERE source = ? AND kind = ?
       ORDER BY id DESC LIMIT 1`,
      [source, kind],
    );
  }
  return sqlGet<{ captured_at: string }>(
    `SELECT captured_at FROM metric_snapshots
     WHERE source = ?
     ORDER BY id DESC LIMIT 1`,
    [source],
  );
}

export async function GET() {
  const github = lastDigest(["daily_digest"]);
  const canvasSync = lastDigest(["canvas_sync"]);
  const canvasAuth = lastDigest(["auth_check"]);
  const host = lastSnapshot("system", "host_metrics");

  const feedWarm = lastDigest(["feed_warm"]);

  const pulses: Pulse[] = [
    {
      id: "github-digest",
      label: "GitHub digest",
      schedule: "Every 3h (timer) · desk auto while open",
      script: "agents/github-digest.sh",
      lastKind: github?.kind,
      lastTitle: github?.title,
      lastAt: github?.created_at ?? null,
      help: "Posts activity + open PRs into Briefs via /api/ingest",
    },
    {
      id: "canvas-sync",
      label: "Canvas sync",
      schedule: "Every 30m (timer) · every 10m while desk open",
      script: "agents/canvas-sync.sh",
      lastKind: canvasSync?.kind,
      lastTitle: canvasSync?.title,
      lastAt: canvasSync?.created_at ?? null,
      help: "Warms /api/canvas cache and records status in Briefs",
    },
    {
      id: "canvas-auth",
      label: "Canvas auth health",
      schedule: "Every ~25 days + Cursor timer + GH Action",
      script: "agents/canvas-auth-check.sh",
      lastKind: canvasAuth?.kind,
      lastTitle: canvasAuth?.title,
      lastAt: canvasAuth?.created_at ?? null,
      help: "Auth ping — catches expired DU tokens / dead Composio OAuth",
    },
    {
      id: "host-refresh",
      label: "Host metrics",
      schedule: "In-app every 2s · snapshot timer 5m",
      script: "agents/host-snapshot.sh",
      lastAt: host?.captured_at ?? null,
      help: "Live CPU/memory/disk from this machine",
    },
    {
      id: "feed-warm",
      label: "Feed warm",
      schedule: "Every 10m while desk open",
      script: "agents/warm-feeds.sh",
      lastKind: feedWarm?.kind,
      lastTitle: feedWarm?.title,
      lastAt: feedWarm?.created_at ?? null,
      help: "Hits Canvas/GitHub/Email/Calendar/Host so widgets stay fresh",
    },
  ];

  const recent = sqlAll<{ kind: string; title: string; created_at: string }>(
    `SELECT kind, title, created_at FROM digests ORDER BY id DESC LIMIT 8`,
  );

  return NextResponse.json(
    {
      pulses,
      recent,
      composioConfigured: isComposioConfigured(),
      githubConfigured: Boolean(process.env.GITHUB_TOKEN?.trim()),
      installHint: "agents/install-timers.sh",
      runAllHint: "agents/run-all-once.sh",
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

const RUNNABLE: Record<string, string> = {
  "github-digest": "github-digest.sh",
  "canvas-sync": "canvas-sync.sh",
  "canvas-auth": "canvas-auth-check.sh",
  "host-refresh": "host-snapshot.sh",
  "feed-warm": "warm-feeds.sh",
  all: "run-all-once.sh",
};

export async function POST(request: Request) {
  let body: { id?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* empty */
  }
  const id = body.id ?? "all";
  const script = RUNNABLE[id];
  if (!script) {
    return NextResponse.json({ error: "unknown_automation" }, { status: 400 });
  }

  const scriptPath = path.join(process.cwd(), "agents", script);
  const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>(
    (resolve) => {
      const child = spawn("bash", [scriptPath], {
        cwd: process.cwd(),
        env: process.env,
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d) => {
        stdout += String(d);
      });
      child.stderr.on("data", (d) => {
        stderr += String(d);
      });
      child.on("close", (code) => resolve({ code, stdout, stderr }));
      child.on("error", (err) =>
        resolve({ code: 1, stdout: "", stderr: String(err) }),
      );
    },
  );

  return NextResponse.json({
    ok: result.code === 0,
    id,
    code: result.code,
    stdout: result.stdout.slice(0, 4000),
    stderr: result.stderr.slice(0, 2000),
  });
}
