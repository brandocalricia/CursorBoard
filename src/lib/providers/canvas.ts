import type { CanvasPayload } from "../types";

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

export async function fetchCanvas(): Promise<CanvasPayload> {
  const token = process.env.CANVAS_API_TOKEN?.trim();
  const base = process.env.CANVAS_BASE_URL?.trim()?.replace(/\/$/, "");
  if (!token || !base) return SAMPLE;

  const headers = { Authorization: `Bearer ${token}` };
  const coursesRes = await fetch(
    `${base}/api/v1/courses?enrollment_state=active&per_page=20`,
    { headers, cache: "no-store" },
  );
  if (!coursesRes.ok) return SAMPLE;
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

  return { assignments: assignments.slice(0, 12), sample: false };
}
