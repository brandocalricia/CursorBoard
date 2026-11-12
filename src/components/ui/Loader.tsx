"use client";

import { Orbit, LineWobble } from "ldrs/react";
import "ldrs/react/Orbit.css";
import "ldrs/react/LineWobble.css";

/** Open-source loaders from https://uiball.com/ldrs (MIT). */
export function OrbitLoader({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center py-4">
      <Orbit size={size} speed={1.4} color="var(--accent)" />
    </div>
  );
}

export function LineWobbleLoader({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center justify-center ${compact ? "py-2" : "py-8"}`}>
      <LineWobble
        size={compact ? 56 : 80}
        stroke={compact ? 4 : 5}
        speed={1.2}
        color="var(--accent)"
      />
    </div>
  );
}
