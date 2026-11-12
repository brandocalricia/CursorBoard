export type TodoListRead = {
  /** True when the payload is a todo list, including a successful empty list. */
  recognized: boolean;
  todos: unknown[];
};

/**
 * Same shapes as the previous inline parser. An empty `response_data` array is
 * recognized so callers can tell "nothing due" apart from "not a todo payload".
 */
export function readTodoList(data: unknown): TodoListRead {
  if (!data || typeof data !== "object") return { recognized: false, todos: [] };
  const obj = data as Record<string, unknown>;

  if (Array.isArray(obj.response_data)) {
    return { recognized: true, todos: obj.response_data };
  }

  const nested = obj.data;
  if (nested && typeof nested === "object") {
    const inner = nested as Record<string, unknown>;
    if (Array.isArray(inner.response_data)) {
      return { recognized: true, todos: inner.response_data };
    }
  }

  for (const val of Object.values(obj)) {
    if (
      Array.isArray(val) &&
      val[0] &&
      typeof val[0] === "object" &&
      val[0] !== null &&
      "assignment" in (val[0] as object)
    ) {
      return { recognized: true, todos: val };
    }
  }

  return { recognized: false, todos: [] };
}
