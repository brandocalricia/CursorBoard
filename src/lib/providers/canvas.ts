import type { CanvasPayload } from "../types";
import { composioExecute, isComposioConfigured } from "../composio";
import { sqlRun } from "../db";

const SAMPLE: CanvasPayload = {
  assignments: [
    {
      id: "a1",
      name: "Systems Midterm Review",
      course: "CS 320",
      dueAt: new Date(Date.now() + 2 * 86400_000).toISOString(),
      points: 100,
      htmlUrl: "#",
    },
    {
      id: "a2",
      name: "Design Portfolio Critique",
      course: "HCI 210",
      dueAt: new Date(Date.now() + 5 * 86400_000).toISOString(),
      points: 50,
      htmlUrl: "#",
    },
    {
      id: "a3",
      name: "Lab 06: Concurrent Structures",
      course: "CS 320",
      dueAt: new Date(Date.now() + 8 * 86400_000).toISOString(),
      points: 25,
      htmlUrl: "#",
    },
  ],
  sample: true,
};

type CanvasAssignment = {
  id: number;
  name: string;
  due_at: string | null;
  points_possible: number | null;
  html_url: string;
  course_id: number;
};

type TodoItem = {
  context_name?: string;
  context_short_name?: string;
  html_url?: string;
  assignment?: {
    id?: number;
    name?: string;
    due_at?: string | null;
    points_possible?: number | null;
    html_url?: string;
  };
};

function cachePayload(payload: CanvasPayload) {
  try {
    sqlRun(
      `INSERT INTO metric_snapshots (source, kind, payload) VALUES (?, ?, ?)`,
      ["canvas", "assignments", JSON.stringify(payload)],
    );
  } catch {
    /* ignore cache errors */
  }
}

function extractTodos(data: unknown): TodoItem[] {
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;

  if (Array.isArray(obj.response_data)) return obj.response_data as TodoItem[];

  const nested = obj.data;
  if (nested && typeof nested === "object") {
    const n = nested as Record<string, unknown>;
    if (Array.isArray(n.response_data)) return n.response_data as TodoItem[];
  }

  for (const val of Object.values(obj)) {
    if (
      Array.isArray(val) &&
      val[0] &&
      typeof val[0] === "object" &&
      val[0] !== null &&
      "assignment" in (val[0] as object)
    ) {
      return val as TodoItem[];
    }
  }
  return [];
}

async function fetchViaComposio(): Promise<CanvasPayload | null> {
  if (!isComposioConfigured()) return null;

  const result = await composioExecute<unknown>("CANVAS_LIST_TODO_ITEMS", {});
  if (!result.successful) return null;

  const todos = extractTodos(result.data);
  if (!todos.length) return null;

  const assignments: CanvasPayload["assignments"] = todos
    .map((t) => {
      const a = t.assignment;
      if (!a?.id || !a.name) return null;
      return {
        id: String(a.id),
        name: a.name,
        course: t.context_short_name || t.context_name || "Course",
        dueAt: a.due_at ?? null,
        points: a.points_possible ?? null,
        htmlUrl: a.html_url || t.html_url || "#",
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  assignments.sort((a, b) => {
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return a.dueAt.localeCompare(b.dueAt);
  });

  const payload: CanvasPayload = {
    assignments: assignments.slice(0, 16),
    sample: false,
  };
  cachePayload(payload);
  return payload;
}

async function fetchViaManualToken(): Promise<CanvasPayload | null> {
  const token = process.env.CANVAS_API_TOKEN?.trim();
  const base = process.env.CANVAS_BASE_URL?.trim()?.replace(/\/$/, "");
  if (!token || !base) return null;

  const headers = { Authorization: `Bearer ${token}` };
  const coursesRes = await fetch(
    `${base}/api/v1/courses?enrollment_state=active&per_page=20`,
    { headers, cache: "no-store" },
  );
  if (!coursesRes.ok) return null;
  const courses = (await coursesRes.json()) as Array<{ id: number; name: string }>;

  const assignments: CanvasPayload["assignments"] = [];
  await Promise.all(
    courses.slice(0, 8).map(async (course) => {
      const res = await fetch(
        `${base}/api/v1/courses/${course.id}/assignments?bucket=upcoming&per_page=10`,
        { headers, cache: "no-store" },
      );
      if (!res.ok) return;
      const items = (await res.json()) as CanvasAssignment[];
      for (const a of items) {
        assignments.push({
          id: String(a.id),
          name: a.name,
          course: course.name,
          dueAt: a.due_at,
          points: a.points_possible,
          htmlUrl: a.html_url,
        });
      }
    }),
  );

  assignments.sort((a, b) => {
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return a.dueAt.localeCompare(b.dueAt);
  });

  const payload: CanvasPayload = {
    assignments: assignments.slice(0, 12),
    sample: false,
  };
  cachePayload(payload);
  return payload;
}

/**
 * Preference order:
 * 1) Composio OAuth connection (durable; refreshes — not capped at 30 days)
 * 2) Manual CANVAS_API_TOKEN (DU max ~30 days — avoid for daily use)
 * 3) Sample data
 */
export async function fetchCanvas(): Promise<CanvasPayload> {
  const viaComposio = await fetchViaComposio();
  if (viaComposio) return viaComposio;

  const viaToken = await fetchViaManualToken();
  if (viaToken) return viaToken;

  return SAMPLE;
}
