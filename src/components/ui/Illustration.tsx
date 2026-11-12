"use client";

import { cn } from "@/lib/utils";

const MAP = {
  empty: "/illustrations/empty.svg",
  speed: "/illustrations/speed.svg",
  server: "/illustrations/server.svg",
  mailbox: "/illustrations/mailbox.svg",
  connection: "/illustrations/connection.svg",
  analytics: "/illustrations/analytics.svg",
  mail: "/illustrations/mail.svg",
  dashboard: "/illustrations/dashboard.svg",
  world: "/illustrations/world.svg",
} as const;

export type IllustrationName = keyof typeof MAP;

/** Open-source unDraw artwork (MIT collection) — accent via --primary-svg-color. */
export function Illustration({
  name,
  alt = "",
  className,
}: {
  name: IllustrationName;
  alt?: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={MAP[name]}
      alt={alt}
      className={cn("pointer-events-none select-none object-contain", className)}
      style={{ ["--primary-svg-color" as string]: "var(--accent)" }}
      draggable={false}
    />
  );
}
