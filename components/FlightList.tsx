"use client";

import { useEffect, useRef } from "react";
import type { Flight } from "@/lib/types";
import AirlineLogo from "./AirlineLogo";
import { PinIcon, PlaneIcon } from "./icons";

export type FlightFilter = "all" | "commercial";

const FILTERS: { value: FlightFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "commercial", label: "Commercial" },
];

interface Props {
  flights: Flight[]; // already filtered and ordered: pinned first, then nearest
  radiusMi: number;
  filter: FlightFilter;
  onFilterChange: (filter: FlightFilter) => void;
  counts: Record<FlightFilter, number>;
  selectedId: string | null;
  hoverId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

export default function FlightList({
  flights,
  radiusMi,
  filter,
  onFilterChange,
  counts,
  selectedId,
  hoverId,
  loading,
  onSelect,
  onHover,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // When a flight gets pinned it moves to the top — scroll there so it's visible.
  useEffect(() => {
    if (selectedId) scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedId]);

  return (
    <aside className="list" aria-label="Closest flights">
      <div className="list__head">
        <div>
          <div className="eyebrow">Nearest first</div>
          <h2 className="list__title">Closest flights</h2>
        </div>
        <span className="list__count">
          {flights.length} / {radiusMi} MI
        </span>
      </div>
      <div className="filter" role="group" aria-label="Filter flights">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`filter__btn${filter === value ? " filter__btn--on" : ""}`}
            aria-pressed={filter === value}
            onClick={() => onFilterChange(value)}
          >
            {label}
            <span className="filter__count">{counts[value]}</span>
          </button>
        ))}
      </div>
      <div ref={scrollRef} className="list__scroll">
        {flights.length === 0 && (
          <p className="list__empty">
            {loading
              ? "Scanning the sky…"
              : `No ${filter === "commercial" ? "commercial " : ""}aircraft within ${radiusMi} miles right now.`}
          </p>
        )}
        {flights.map((f) => (
          <FlightRow
            key={f.icao24}
            flight={f}
            selected={f.icao24 === selectedId}
            hovered={f.icao24 === hoverId}
            onSelect={onSelect}
            onHover={onHover}
          />
        ))}
      </div>
    </aside>
  );
}

function FlightRow({
  flight: f,
  selected,
  hovered,
  onSelect,
  onHover,
}: {
  flight: Flight;
  selected: boolean;
  hovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const alt = f.altitudeFt === null ? "—" : `${f.altitudeFt.toLocaleString("en-US")} ft`;
  return (
    <button
      type="button"
      className={`row${selected ? " row--selected" : ""}${hovered ? " row--hover" : ""}`}
      aria-pressed={selected}
      onClick={() => onSelect(f.icao24)}
      onMouseEnter={() => onHover(f.icao24)}
      onMouseLeave={() => onHover(null)}
    >
      <span className="row__top">
        <AirlineLogo iata={f.airlineIata} callsign={f.callsign} />
        <span className="row__id">
          <span className="row__flight">
            {f.flightNumber}
            {selected && (
              <span className="pinned">
                <PinIcon />
                PINNED
              </span>
            )}
          </span>
          <span className="row__airline">{f.airlineName ?? f.callsign}</span>
        </span>
        <span className="row__dist">
          <span className="row__dist-num">
            {f.distanceMi.toFixed(1)}
            <span className="row__dist-unit"> mi</span>
          </span>
          <span className="row__alt">{alt}</span>
        </span>
      </span>

      <span className="route">
        <span className="route__end">
          <span className="route__code">{f.origin?.iata ?? f.origin?.icao ?? "—"}</span>
          <span className="route__city">{f.origin?.city ?? "Unknown"}</span>
        </span>
        <span className="route__line">
          <PlaneIcon size={14} className="route__icon" />
        </span>
        <span className="route__end route__end--to">
          <span className="route__code">{f.destination?.iata ?? f.destination?.icao ?? "—"}</span>
          <span className="route__city">{f.destination?.city ?? "Unknown"}</span>
        </span>
      </span>

      {selected && (
        <span className="details">
          <Detail label="ALTITUDE" value={alt} />
          <Detail label="SPEED" value={f.speedKt === null ? "—" : `${f.speedKt} kt`} />
          <Detail label="HEADING" value={`${f.headingDeg}°`} />
        </span>
      )}
    </button>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <span className="detail">
      <span className="detail__label">{label}</span>
      <span className="detail__value">{value}</span>
    </span>
  );
}
