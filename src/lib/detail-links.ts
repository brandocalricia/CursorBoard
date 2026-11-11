import type { DetailItem, DetailLink } from "./types";

const SOURCE_HOME: Record<DetailItem["source"], DetailLink> = {
  github: { url: "https://github.com", label: "Open GitHub" },
  canvas: { url: "https://canvas.du.edu", label: "Open Canvas" },
  email: { url: "https://mail.google.com", label: "Open Gmail" },
  system: { url: "https://github.com/brandocalricia/CursorBoard", label: "Open project repo" },
};

/** Ensure every detail has at least one real outbound link. */
export function withGuaranteedLinks(item: DetailItem): DetailItem & { links: DetailLink[] } {
  const links: DetailLink[] = [];
  const seen = new Set<string>();

  const push = (link?: DetailLink | null) => {
    if (!link?.url || link.url === "#" || seen.has(link.url)) return;
    seen.add(link.url);
    links.push(link);
  };

  if (item.linkUrl) {
    push({ url: item.linkUrl, label: item.linkLabel ?? "Open original" });
  }
  for (const l of item.links ?? []) push(l);

  // Fallbacks so the sheet never ends without a destination
  if (item.source === "github") {
    push({ url: "https://github.com", label: "GitHub home" });
  } else if (item.source === "canvas") {
    push({ url: "https://canvas.du.edu", label: "Canvas home" });
  } else if (item.source === "email") {
    push({ url: "https://mail.google.com", label: "Open Gmail" });
  } else {
    push(SOURCE_HOME.system);
  }

  if (!links.length) push(SOURCE_HOME[item.source]);

  return {
    ...item,
    linkUrl: item.linkUrl ?? links[0]?.url,
    linkLabel: item.linkLabel ?? links[0]?.label,
    links,
  };
}
