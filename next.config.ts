import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use default Next output for local `npm start`. For container/Tauri bundling,
  // set HIGH_DASHBOARD_STANDALONE=1 at build time.
  ...(process.env.HIGH_DASHBOARD_STANDALONE === "1"
    ? { output: "standalone" as const }
    : {}),
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
