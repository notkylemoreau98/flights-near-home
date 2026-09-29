"use client";

import { useCallback, useEffect, useState } from "react";
import type { Home } from "@/lib/types";

const STORAGE_KEY = "flights-near-home:home";

export const DEFAULT_HOME: Home = {
  address: process.env.NEXT_PUBLIC_HOME_ADDRESS || "Los Angeles, CA",
  lat: Number(process.env.NEXT_PUBLIC_HOME_LAT ?? 34.0537),
  lon: Number(process.env.NEXT_PUBLIC_HOME_LON ?? -118.2428),
};

/** Home location, remembered in this browser. */
export function useHome() {
  const [home, setHomeState] = useState<Home>(DEFAULT_HOME);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Home;
        if (Number.isFinite(saved.lat) && Number.isFinite(saved.lon)) setHomeState(saved);
      }
    } catch {
      /* storage unavailable — keep default */
    }
  }, []);

  const setHome = useCallback((next: Home) => {
    setHomeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  return [home, setHome] as const;
}
