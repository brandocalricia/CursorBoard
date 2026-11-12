"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Options<T> = {
  /** Fetcher; return null to keep previous data */
  fetcher: () => Promise<T>;
  /** Poll interval ms; default 45s */
  intervalMs?: number;
  /** Refresh when window gains focus */
  refreshOnFocus?: boolean;
  enabled?: boolean;
};

/**
 * Near-realtime client fetch with interval + focus refresh.
 * Host/speed keep their own faster polls; use this for Canvas/GitHub/Email/etc.
 */
export function useLiveQuery<T>({
  fetcher,
  intervalMs = 45_000,
  refreshOnFocus = true,
  enabled = true,
}: Options<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const inFlight = useRef(false);

  const load = useCallback(async (quiet = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const next = await fetcherRef.current();
      setData(next);
      setUpdatedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void load(false);
    const id = window.setInterval(() => void load(true), intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs, load]);

  useEffect(() => {
    if (!enabled || !refreshOnFocus) return;
    const onFocus = () => void load(true);
    const onVis = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled, refreshOnFocus, load]);

  return {
    data,
    error,
    loading,
    updatedAt,
    refresh: () => load(false),
  };
}
