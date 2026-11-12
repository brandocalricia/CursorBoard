"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "outline" | "accent";
  size?: "sm" | "md" | "icon";
};

export const Button = React.forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "default", size = "md", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50",
        variant === "default" &&
          "bg-muted text-foreground hover:bg-[color-mix(in_oklab,var(--muted)_80%,var(--accent))]",
        variant === "ghost" &&
          "text-muted-foreground hover:bg-muted hover:text-foreground",
        variant === "outline" && "border border-border bg-transparent hover:bg-muted",
        variant === "accent" &&
          "bg-[var(--accent)] font-bold text-[var(--accent-foreground)] hover:brightness-110",
        size === "sm" && "h-8 rounded-md px-3",
        size === "md" && "h-9 rounded-md px-3.5",
        size === "icon" && "h-9 w-9 rounded-md",
        className,
      )}
      {...props}
    />
  );
});
