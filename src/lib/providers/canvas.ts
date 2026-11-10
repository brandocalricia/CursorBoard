import type { CanvasAssignment, CanvasPayload, DetailItem } from "../types";
import { composioExecute, isComposioConfigured } from "../composio";
import { sqlGet, sqlRun } from "../db";
import { htmlToText } from "../sanitize";

const SAMPLE_DETAILS: Record<string, { html: string; text: string }> = {
  a1: {
    html: `<p><strong>Goal:</strong> prepare for the systems midterm.</p>
<ul>
<li>Review concurrency primitives (mutex, RW locks, atomics)</li>
<li>Walk the practice exam in Gradescope</li>
<li>Bring 1 open question to office hours</li>
</ul>
<p>Submit nothing — this is a checkpoint for yourself.</p>`,
    text: "Goal: prepare for the systems midterm. Review concurrency primitives, walk the practice exam, bring 1 open question to office hours.",
  },
  a2: {
    html: `<p>Bring your portfolio case study deck (PDF or Figma).</p>
<p>Focus on: problem framing, constraints, and one metric you would improve next.</p>`,
    text: "Bring your portfolio case study deck. Focus on problem framing, constraints, and one metric you would improve next.",
  },
  a3: {
    html: `<p>Implement a lock-free stack and a coarse-grained concurrent hash map.</p>
<p>Include a short write-up of trade-offs (≤ 400 words) and your benchmark numbers.</p>`,
    text: "Implement a lock-free stack and a coarse-grained concurrent hash map. Include a short write-up of trade-offs and benchmark numbers.",
  },
};

const SAMPLE: CanvasPayload = {
  assignments: [
    {
      id: "a1",
      name: "Systems Midterm Review",
      course: "CS 320",
      dueAt: new Date(Date.now() + 2 * 86400_000).toISOString(),
      points: 100,
      htmlUrl: "https://canvas.du.edu",
      descriptionHtml: SAMPLE_DETAILS.a1!.html,
      descriptionText: SAMPLE_DETAILS.a1!.text,
    },
    {
      id: "a2",
      name: "Design Portfolio Critique",
      course: "HCI 210",
      dueAt: new Date(Date.now() + 5 * 86400_000).toISOString(),
      points: 50,
      htmlUrl: "https://canvas.du.edu",
      descriptionHtml: SAMPLE_DETAILS.a2!.html,
      descriptionText: SAMPLE_DETAILS.a2!.text,
    },
    {
      id: "a3",
      name: "Lab 06: Concurrent Structures",
      course: "CS 320",
      dueAt: new Date(Date.now() + 8 * 86400_000).toISOString(),
      points: 25,
      htmlUrl: "https://canvas.du.edu",
      descriptionHtml: SAMPLE_DETAILS.a3!.html,
      descriptionText: SAMPLE_DETAILS.a3!.text,
    },
  ],
  sample: true,
};

type CanvasAssignmentRaw = {
  id: number;
  name: string;
  due_at: string | null;
  points_possible: number | null;
  html_url: string;
  course_id: number;
  description?: string | null;
};

type TodoItem = {
  context_name?: string;
  context_short_name?: string;
  html_url?: string;
  course_id?: number;
  assignment?: {
    id?: number;
    name?: string;
    due_at?: string | null;
    points_possible?: number | null;
    html_url?: string;
    description?: string | null;
  };
};

function cachePayload(payload: CanvasPayload) {
  try {
    sqlRun(
      `INSERT INTO metric_snapshots (source, kind, payload) VALUES (?, ?, ?)`,
      ["canvas", "assignments", JSON.stringify(payload)],
    );
  } catch {
    /* ignore */
  }
}

function cacheDetail(id: string, detail: DetailItem) {
  try {
    sqlRun(
      `INSERT INTO metric_snapshots (source, kind, payload) VALUES (?, ?, ?)`,
      ["canvas", `assignment:${id}`, JSON.stringify(detail)],
    );
  } catch {
    /* ignore */
  }
}

function readCachedDetail(id: string): DetailItem | null {
  try {
    const row = sqlGet<{ payload: string }>(
      `SELECT payload FROM metric_snapshots
       WHERE source = 'canvas' AND kind = ?
       ORDER BY id DESC LIMIT 1`,
      [`assignment:${id}`],
    );
    if (!row) return null;
    return JSON.parse(row.payload) as DetailItem;
  } catch {
    return null;
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

function extractAssignment(data: unknown): CanvasAssignmentRaw | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (typeof obj.id === "number" && typeof obj.name === "string") {
    return obj as unknown as CanvasAssignmentRaw;
  }
  if (obj.response_data && typeof obj.response_data === "object") {
    return extractAssignment(obj.response_data);
  }
  if (obj.data && typeof obj.data === "object") {
    return extractAssignment(obj.data);
  }
  return null;
}

function toAssignment(t: TodoItem): CanvasAssignment | null {
  const a = t.assignment;
  if (!a?.id || !a.name) return null;
  const descriptionHtml = a.description ?? null;
  return {
    id: String(a.id),
    courseId: t.course_id ? String(t.course_id) : undefined,
    name: a.name,
    course: t.context_short_name || t.context_name || "Course",
    dueAt: a.due_at ?? null,
    points: a.points_possible ?? null,
    htmlUrl: a.html_url || t.html_url || "#",
    descriptionHtml,
    descriptionText: htmlToText(descriptionHtml),
  };
}

async function fetchViaComposio(): Promise<CanvasPayload | null> {
  if (!isComposioConfigured()) return null;

  const result = await composioExecute<unknown>("CANVAS_LIST_TODO_ITEMS", {});
  if (!result.successful) return null;

  const todos = extractTodos(result.data);
  if (!todos.length) return null;

  const assignments = todos
    .map(toAssignment)
    .filter((x): x is CanvasAssignment => Boolean(x));

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

  const assignments: CanvasAssignment[] = [];
  await Promise.all(
    courses.slice(0, 8).map(async (course) => {
      const res = await fetch(
        `${base}/api/v1/courses/${course.id}/assignments?bucket=upcoming&per_page=10&include[]=description`,
        { headers, cache: "no-store" },
      );
      if (!res.ok) return;
      const items = (await res.json()) as CanvasAssignmentRaw[];
      for (const a of items) {
        assignments.push({
          id: String(a.id),
          courseId: String(course.id),
          name: a.name,
          course: course.name,
          dueAt: a.due_at,
          points: a.points_possible,
          htmlUrl: a.html_url,
          descriptionHtml: a.description ?? null,
          descriptionText: htmlToText(a.description),
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

export async function fetchCanvas(): Promise<CanvasPayload> {
  const viaComposio = await fetchViaComposio();
  if (viaComposio) return viaComposio;

  const viaToken = await fetchViaManualToken();
  if (viaToken) return viaToken;

  return SAMPLE;
}

export async function fetchCanvasAssignmentDetail(
  id: string,
): Promise<DetailItem | null> {
  const cached = readCachedDetail(id);
  if (cached?.bodyHtml || cached?.bodyText) return cached;

  const list = await fetchCanvas();
  const fromList = list.assignments.find((a) => a.id === id);

  if (fromList?.descriptionHtml || fromList?.descriptionText) {
    const detail: DetailItem = {
      id,
      source: "canvas",
      title: fromList.name,
      subtitle: fromList.course,
      meta: [
        fromList.dueAt ? `Due ${new Date(fromList.dueAt).toLocaleString()}` : "No due date",
        fromList.points != null ? `${fromList.points} pts` : "",
      ].filter(Boolean),
      bodyHtml: fromList.descriptionHtml,
      bodyText: fromList.descriptionText,
      linkUrl: fromList.htmlUrl !== "#" ? fromList.htmlUrl : undefined,
      linkLabel: "Open in Canvas",
    };
    cacheDetail(id, detail);
    return detail;
  }

  // Live detail via Composio get-assignment when we have course id
  if (isComposioConfigured() && fromList?.courseId) {
    const result = await composioExecute<unknown>("CANVAS_GET_SINGLE_ASSIGNMENT", {
      course_id: Number(fromList.courseId),
      id: Number(id),
      include: ["description"],
    });
    if (result.successful) {
      const raw = extractAssignment(result.data);
      if (raw) {
        const detail: DetailItem = {
          id,
          source: "canvas",
          title: raw.name,
          subtitle: fromList.course,
          meta: [
            raw.due_at ? `Due ${new Date(raw.due_at).toLocaleString()}` : "No due date",
            raw.points_possible != null ? `${raw.points_possible} pts` : "",
          ].filter(Boolean),
          bodyHtml: raw.description ?? null,
          bodyText: htmlToText(raw.description),
          linkUrl: raw.html_url,
          linkLabel: "Open in Canvas",
        };
        cacheDetail(id, detail);
        return detail;
      }
    }
  }

  // Manual token detail
  const token = process.env.CANVAS_API_TOKEN?.trim();
  const base = process.env.CANVAS_BASE_URL?.trim()?.replace(/\/$/, "");
  if (token && base && fromList?.courseId) {
    const res = await fetch(
      `${base}/api/v1/courses/${fromList.courseId}/assignments/${id}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    if (res.ok) {
      const raw = (await res.json()) as CanvasAssignmentRaw;
      const detail: DetailItem = {
        id,
        source: "canvas",
        title: raw.name,
        subtitle: fromList.course,
        meta: [
          raw.due_at ? `Due ${new Date(raw.due_at).toLocaleString()}` : "No due date",
          raw.points_possible != null ? `${raw.points_possible} pts` : "",
        ].filter(Boolean),
        bodyHtml: raw.description ?? null,
        bodyText: htmlToText(raw.description),
        linkUrl: raw.html_url,
        linkLabel: "Open in Canvas",
      };
      cacheDetail(id, detail);
      return detail;
    }
  }

  if (fromList) {
    const sampleExtra = SAMPLE_DETAILS[id];
    return {
      id,
      source: "canvas",
      title: fromList.name,
      subtitle: fromList.course,
      meta: [
        fromList.dueAt ? `Due ${new Date(fromList.dueAt).toLocaleString()}` : "No due date",
        fromList.points != null ? `${fromList.points} pts` : "",
      ].filter(Boolean),
      bodyHtml: sampleExtra?.html ?? null,
      bodyText:
        sampleExtra?.text ??
        "No description was returned for this assignment. Open it in Canvas for full instructions.",
      linkUrl: fromList.htmlUrl !== "#" ? fromList.htmlUrl : undefined,
      linkLabel: "Open in Canvas",
    };
  }

  return null;
}
