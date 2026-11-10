"use client";

import { cn } from "@/lib/utils";
import { LineWobbleLoader } from "@/components/ui/Loader";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton-shine rounded-xl bg-muted/70", className)} />;
}

export function WidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-1">
      <LineWobbleLoader />
      <div className="flex items-center justify-between gap-3 px-1">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-6 w-14 rounded-lg" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-2xl" />
      ))}
    </div>
  );
}
