import type { DetailItem, DetailLink } from "./types";

const SOURCE_HOME: Record<DetailItem["source"], DetailLink> = {
  github: { url: "https://github.com", label: "Open GitHub" },
  canvas: { url: "https://canvas.du.edu", label: "Open Canvas" },
  email: { url: "https://mail.google.com", label: "Open Gmail" },
  calendar: { url: "https://calendar.google.com", label: "Open Calendar" },
  system: {
    url: "https://github.com/brandocalricia/CursorBoard",
    label: "Open project repo",
  },
};

/** True when a URL looks like a site home, not a specific item. */
export function isGenericHomeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "") || "/";
    if (path !== "/" && path !== "") return false;
    // bare hosts / roots only
    return true;
  } catch {
    return url === "#" || !url;
  }
}

/**
 * Ensure every detail has at least one outbound link.
 * Prefer exact item URLs. Never promote a site home above an item link.
 * Only add a home fallback when no specific item URL exists.
 */
export function withGuaranteedLinks(
  item: DetailItem,
): DetailItem & { links: DetailLink[] } {
  const links: DetailLink[] = [];
  const seen = new Set<string>();

  const push = (link?: DetailLink | null) => {
    if (!link?.url || link.url === "#" || seen.has(link.url)) return;
    seen.add(link.url);
    links.push(link);
  };

  if (item.linkUrl) {
    push({
      url: item.linkUrl,
      label: item.linkLabel ?? "Open original",
    });
  }
  for (const l of item.links ?? []) push(l);

  const hasSpecific = links.some((l) => !isGenericHomeUrl(l.url));
  if (!hasSpecific) {
    // Last resort only — sheet should never be dead, but prefer item URLs upstream
    push(SOURCE_HOME[item.source] ?? SOURCE_HOME.system);
  }

  const primary =
    links.find((l) => !isGenericHomeUrl(l.url)) ?? links[0] ?? undefined;

  return {
    ...item,
    linkUrl: item.linkUrl && !isGenericHomeUrl(item.linkUrl) ? item.linkUrl : primary?.url,
    linkLabel:
      item.linkLabel ??
      (item.linkUrl && !isGenericHomeUrl(item.linkUrl)
        ? item.linkLabel
        : primary?.label) ??
      primary?.label,
    links,
  };
}
