import { NextResponse } from "next/server";
import { sqlAll, sqlGet } from "@/lib/db";
import { isComposioConfigured } from "@/lib/composio";
import { guardAutomationPost } from "@/lib/request-guard";
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

  const pulses: Pulse[] = [
    {
      id: "github-digest",
      label: "GitHub digest",
      schedule: "Daily 07:00 (systemd)",
      script: "agents/github-digest.sh",
      lastKind: github?.kind,
      lastTitle: github?.title,
      lastAt: github?.created_at ?? null,
      help: "Posts activity + open PRs into Briefs via /api/ingest",
    },
    {
      id: "canvas-sync",
      label: "Canvas sync",
      schedule: "Every 6h (systemd)",
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
      help: "Composio OAuth ping — avoids DU 30-day manual tokens",
    },
    {
      id: "host-refresh",
      label: "Host metrics",
      schedule: "In-app every 15s",
      script: "agents/host-snapshot.sh",
      lastAt: host?.captured_at ?? null,
      help: "Live CPU/memory/disk from this machine",
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
  all: "run-all-once.sh",
};

export async function POST(request: Request) {
  let parsed: unknown;
  let invalidJson = false;
  try {
    parsed = await request.json();
  } catch {
    parsed = undefined;
    invalidJson = true;
  }

  const decision = guardAutomationPost(
    request,
    parsed,
    Object.keys(RUNNABLE),
    process.env.INGEST_SECRET,
    invalidJson,
  );
  if (!decision.ok) {
    return NextResponse.json(
      { error: decision.error },
      { status: decision.status, headers: { "cache-control": "private, no-store" } },
    );
  }

  const id = decision.id;
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
