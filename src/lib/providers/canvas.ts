import type { CanvasAssignment, CanvasPayload, DetailItem } from "../types";
import { composioExecute, isComposioConfigured } from "../composio";
import { sqlGet, sqlRun } from "../db";
import { htmlToText } from "../sanitize";
import { readTodoList } from "./canvas-todos";

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

function canvasBase(): string {
  return (
    process.env.CANVAS_BASE_URL?.trim()?.replace(/\/$/, "") ||
    "https://canvas.du.edu"
  );
}

/** Prefer Canvas html_url; otherwise build the exact assignment path. */
export function assignmentDeepLink(
  base: string,
  courseId: string | number | undefined,
  assignmentId: string | number,
  htmlUrl?: string | null,
): string {
  if (htmlUrl && htmlUrl !== "#" && !htmlUrl.endsWith("://canvas.du.edu") && htmlUrl !== base) {
    try {
      const u = new URL(htmlUrl);
      if (u.pathname && u.pathname !== "/") return htmlUrl;
    } catch {
      /* fall through */
    }
  }
  if (courseId != null && String(courseId)) {
    return `${base}/courses/${courseId}/assignments/${assignmentId}`;
  }
  return `${base}/`;
}

const SAMPLE: CanvasPayload = {
  assignments: [
    {
      id: "a1",
      courseId: "320",
      name: "Systems Midterm Review",
      course: "CS 320",
      dueAt: new Date(Date.now() + 2 * 86400_000).toISOString(),
      points: 100,
      htmlUrl: "https://canvas.du.edu/courses/320/assignments/a1",
      descriptionHtml: SAMPLE_DETAILS.a1!.html,
      descriptionText: SAMPLE_DETAILS.a1!.text,
    },
    {
      id: "a2",
      courseId: "210",
      name: "Design Portfolio Critique",
      course: "HCI 210",
      dueAt: new Date(Date.now() + 5 * 86400_000).toISOString(),
      points: 50,
      htmlUrl: "https://canvas.du.edu/courses/210/assignments/a2",
      descriptionHtml: SAMPLE_DETAILS.a2!.html,
      descriptionText: SAMPLE_DETAILS.a2!.text,
    },
    {
      id: "a3",
      courseId: "320",
      name: "Lab 06: Concurrent Structures",
      course: "CS 320",
      dueAt: new Date(Date.now() + 8 * 86400_000).toISOString(),
      points: 25,
      htmlUrl: "https://canvas.du.edu/courses/320/assignments/a3",
      descriptionHtml: SAMPLE_DETAILS.a3!.html,
      descriptionText: SAMPLE_DETAILS.a3!.text,
    },
  ],
  sample: true,
  authStatus: "sample",
  canvasBaseUrl: "https://canvas.du.edu",
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
  const courseId = t.course_id ? String(t.course_id) : undefined;
  return {
    id: String(a.id),
    courseId,
    name: a.name,
    course: t.context_short_name || t.context_name || "Course",
    dueAt: a.due_at ?? null,
    points: a.points_possible ?? null,
    htmlUrl: assignmentDeepLink(
      canvasBase(),
      courseId,
      a.id,
      a.html_url || t.html_url,
    ),
    descriptionHtml,
    descriptionText: htmlToText(descriptionHtml),
  };
}

async function fetchViaComposio(): Promise<CanvasPayload | null> {
  if (!isComposioConfigured()) return null;

  const result = await composioExecute<unknown>("CANVAS_LIST_TODO_ITEMS", {});
  if (!result.successful) return null;

  const extracted = readTodoList(result.data);
  // Empty but recognized: Composio succeeded and nothing is due. Falling
  // through shows sample assignments and a false "token missing" banner.
  if (!extracted.recognized) return null;

  const assignments = (extracted.todos as TodoItem[])
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
    authStatus: "ok",
    canvasBaseUrl: canvasBase(),
  };
  cachePayload(payload);
  return payload;
}

type ManualResult =
  | { ok: true; payload: CanvasPayload }
  | { ok: false; status: CanvasPayload["authStatus"]; message: string };

async function fetchViaManualToken(): Promise<ManualResult> {
  const token = process.env.CANVAS_API_TOKEN?.trim();
  const base = process.env.CANVAS_BASE_URL?.trim()?.replace(/\/$/, "");
  if (!token || !base) {
    return {
      ok: false,
      status: "token_missing",
      message: "CANVAS_API_TOKEN or CANVAS_BASE_URL is missing in .env.local",
    };
  }

  const headers = { Authorization: `Bearer ${token}` };
  let coursesRes: Response;
  try {
    coursesRes = await fetch(
      `${base}/api/v1/courses?enrollment_state=active&per_page=20`,
      { headers, cache: "no-store" },
    );
  } catch {
    return {
      ok: false,
      status: "network_error",
      message: "Could not reach Canvas. Check your network and try again.",
    };
  }

  if (coursesRes.status === 401 || coursesRes.status === 403) {
    return {
      ok: false,
      status: "token_expired",
      message:
        "Your Canvas access token was rejected (expired or revoked). DU tokens last ~30 days — renew it below.",
    };
  }
  if (!coursesRes.ok) {
    return {
      ok: false,
      status: "unauthorized",
      message: `Canvas returned HTTP ${coursesRes.status}.`,
    };
  }

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
          htmlUrl: assignmentDeepLink(base, course.id, a.id, a.html_url),
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
    authStatus: "ok",
    canvasBaseUrl: base,
  };
  cachePayload(payload);
  return { ok: true, payload };
}

export async function fetchCanvas(): Promise<CanvasPayload> {
  const viaComposio = await fetchViaComposio();
  if (viaComposio) return viaComposio;

  const viaToken = await fetchViaManualToken();
  if (viaToken.ok) return viaToken.payload;

  // Token configured but expired/rejected — surface renewal UI, not silent sample
  if (
    viaToken.status === "token_expired" ||
    viaToken.status === "unauthorized"
  ) {
    return {
      assignments: [],
      sample: false,
      authStatus: viaToken.status,
      authMessage: viaToken.message,
      canvasBaseUrl: canvasBase(),
    };
  }

  // No usable live source — sample for first-run preview
  return {
    ...SAMPLE,
    authStatus:
      viaToken.status === "token_missing" && !isComposioConfigured()
        ? "token_missing"
        : viaToken.status ?? "sample",
    authMessage: viaToken.message,
    canvasBaseUrl: canvasBase(),
  };
}

function withAssignmentLink(
  detail: DetailItem,
  courseId?: string,
  htmlUrl?: string | null,
): DetailItem {
  return {
    ...detail,
    linkUrl: assignmentDeepLink(canvasBase(), courseId, detail.id, htmlUrl ?? detail.linkUrl),
    linkLabel: detail.linkLabel ?? "Open assignment in Canvas",
  };
}

export async function fetchCanvasAssignmentDetail(
  id: string,
): Promise<DetailItem | null> {
  const list = await fetchCanvas();
  const fromList = list.assignments.find((a) => a.id === id);

  const cached = readCachedDetail(id);
  if (cached?.bodyHtml || cached?.bodyText) {
    // Re-stamp exact deep link — SQLite may hold older home-only URLs
    return withAssignmentLink(cached, fromList?.courseId, fromList?.htmlUrl);
  }

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
      linkUrl: assignmentDeepLink(
        canvasBase(),
        fromList.courseId,
        id,
        fromList.htmlUrl,
      ),
      linkLabel: "Open assignment in Canvas",
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
          linkUrl: assignmentDeepLink(
            canvasBase(),
            fromList.courseId ?? raw.course_id,
            id,
            raw.html_url,
          ),
          linkLabel: "Open assignment in Canvas",
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
        linkUrl: assignmentDeepLink(base, fromList.courseId, id, raw.html_url),
        linkLabel: "Open assignment in Canvas",
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
      linkUrl: assignmentDeepLink(
        canvasBase(),
        fromList.courseId,
        id,
        fromList.htmlUrl,
      ),
      linkLabel: "Open assignment in Canvas",
    };
  }

  return null;
}
