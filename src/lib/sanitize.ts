/** Allowlisted HTML cleanup for Canvas/email bodies. */

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "a",
  "code",
  "pre",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "span",
  "div",
]);

const MARK = "\uE000";

/**
 * Rebuild one tag into a safe allowlisted form.
 * Returns null when `full` is not an HTML tag (caller keeps it and escapes it).
 * Returns "" when the tag must be removed.
 */
function rebuildTag(full: string): string | null {
  const match = /^<\/?([a-zA-Z][a-zA-Z0-9]*)/.exec(full);
  if (!match) return null;
  const name = match[1]!.toLowerCase();
  if (!ALLOWED_TAGS.has(name)) return "";
  if (full.startsWith("</")) return `</${name}>`;
  if (name === "br") return "<br />";
  if (name === "a") {
    const hrefMatch = /\shref\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(full);
    const href = (hrefMatch?.[1] || hrefMatch?.[2] || "").trim();
    // Quote, space, or slash-attribute forms must not be copied through.
    if (!/^https?:\/\/[^\s"'<>\\]+$/i.test(href)) return "<a>";
    return `<a href="${href}" target="_blank" rel="noreferrer">`;
  }
  return `<${name}>`;
}

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";
  let html = input.replaceAll(MARK, "");
  html = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, "");

  const kept: string[] = [];
  html = html.replace(/<\/?[^>]*>/g, (full) => {
    const rebuilt = rebuildTag(full);
    if (rebuilt === null) return full;
    if (!rebuilt) return "";
    kept.push(rebuilt);
    return `${MARK}${kept.length - 1}${MARK}`;
  });

  // Anything still containing < was not an allowlisted tag. Escape it so the
  // browser cannot parse slash-attribute forms like <svg/onload=...> that the
  // old "space before attributes" matcher left untouched.
  html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(new RegExp(`${MARK}(\\d+)${MARK}`, "g"), (_, index: string) => {
    return kept[Number(index)] ?? "";
  });
  return html;
}

export function htmlToText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
