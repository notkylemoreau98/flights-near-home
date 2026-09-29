"use client";

import { useMemo, useState } from "react";
import { useFlights } from "@/hooks/useFlights";
import { useHome } from "@/hooks/useHome";
import type { Airport, Flight } from "@/lib/types";
import FlightList, { type FlightFilter } from "./FlightList";
import Header from "./Header";
import Logo from "./Logo";
import RadarMap from "./RadarMap";

const DEFAULT_RADIUS_MI = Number(process.env.NEXT_PUBLIC_RADIUS_MI ?? 15) || 15;

const hasAirport = (a: Airport | null) => Boolean(a?.iata || a?.icao);
// Commercial = a scheduled route was found (origin and destination known). Private,
// GA and military traffic has no route in adsbdb, so it shows as "Unknown".
const isCommercial = (f: Flight) => hasAirport(f.origin) && hasAirport(f.destination);

export default function FlightTracker() {
  const [home, setHome] = useHome();
  const [radiusMi, setRadiusMi] = useState(DEFAULT_RADIUS_MI);
  const { flights: allFlights, fetchedAt, stale, error, loading } = useFlights(home, radiusMi);
  const [filter, setFilter] = useState<FlightFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const commercialCount = useMemo(() => allFlights.filter(isCommercial).length, [allFlights]);
  const flights = useMemo(() => (filter === "commercial" ? allFlights.filter(isCommercial) : allFlights), [allFlights, filter]);

  const toggleSelect = (id: string) => setSelectedId((cur) => (cur === id ? null : id));

  // Nearest first; the pinned flight (if still in range) always sits on top.
  const ordered = useMemo(() => {
    const sorted = [...flights].sort((a, b) => a.distanceMi - b.distanceMi);
    const i = selectedId ? sorted.findIndex((f) => f.icao24 === selectedId) : -1;
    if (i > 0) sorted.unshift(sorted.splice(i, 1)[0]);
    return sorted;
  }, [flights, selectedId]);

  const nearestMi = flights.length ? Math.min(...flights.map((f) => f.distanceMi)) : null;
  const alts = flights.map((f) => f.altitudeFt).filter((a): a is number => a !== null);
  const lowestFt = alts.length ? Math.min(...alts) : null;

  return (
    <div className="page">
      <Logo />
      <Header
        home={home}
        onHomeChange={(h) => {
          setSelectedId(null);
          setHome(h);
        }}
        count={flights.length}
        nearestMi={nearestMi}
        lowestFt={lowestFt}
        fetchedAt={fetchedAt}
        stale={stale}
      />
      <main className="main">
        <RadarMap
          home={home}
          radiusMi={radiusMi}
          onRadiusChange={setRadiusMi}
          flights={flights}
          selectedId={selectedId}
          hoverId={hoverId}
          onSelect={toggleSelect}
          onHover={setHoverId}
          status={error}
        />
        <FlightList
          flights={ordered}
          radiusMi={radiusMi}
          filter={filter}
          onFilterChange={setFilter}
          counts={{ all: allFlights.length, commercial: commercialCount }}
          selectedId={selectedId}
          hoverId={hoverId}
          loading={loading}
          onSelect={toggleSelect}
          onHover={setHoverId}
        />
      </main>
    </div>
  );
}
