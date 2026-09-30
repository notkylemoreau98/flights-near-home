"use client";

import { useEffect, useState } from "react";
import type { Flight, FlightsResponse, Home } from "@/lib/types";

const POLL_MS = 15_000; // matches the server's adsb.lol cache TTL

interface State {
  flights: Flight[];
  fetchedAt: number | null;
  stale: boolean;
  error: string | null;
  loading: boolean;
}

export function useFlights(home: Home, radiusMi: number): State {
  const [state, setState] = useState<State>({
    flights: [],
    fetchedAt: null,
    stale: false,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    setState((s) => ({ ...s, flights: [], loading: true, error: null }));

    const load = async () => {
      try {
        const qs = new URLSearchParams({
          lat: String(home.lat),
          lon: String(home.lon),
          radius: String(radiusMi),
        });
        const res = await fetch(`/api/flights?${qs}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = (await res.json()) as FlightsResponse;
        if (cancelled) return;
        setState((s) => ({
          flights: res.ok || data.flights.length ? data.flights : s.flights,
          fetchedAt: data.fetchedAt ?? s.fetchedAt,
          stale: data.stale,
          error: data.error ?? null,
          loading: false,
        }));
      } catch {
        if (!cancelled)
          setState((s) => ({
            ...s,
            stale: true,
            error: "Connection lost — retrying…",
            loading: false,
          }));
      } finally {
        if (!cancelled) timer = setTimeout(load, document.hidden ? POLL_MS * 4 : POLL_MS);
      }
    };

    load();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [home.lat, home.lon, radiusMi]);

  return state;
}
