"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { offsetMi } from "@/lib/geo";
import { TILE_ATTRIBUTION, tilesFor } from "@/lib/tiles";
import type { Flight, Home } from "@/lib/types";
import { ArrowRightIcon, ChevronIcon, CursorIcon, HomeIcon, PlaneIcon, RadarIcon } from "./icons";

interface Props {
  home: Home;
  radiusMi: number;
  onRadiusChange: (mi: number) => void;
  flights: Flight[];
  selectedId: string | null;
  hoverId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  status?: string | null;
}

const EDGE_PAD = 24;
export const RADIUS_OPTIONS = [5, 10, 15, 25, 50];

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

export default function RadarMap({ home, radiusMi, onRadiusChange, flights, selectedId, hoverId, onSelect, onHover, status }: Props) {
  const [ref, { w, h }] = useSize<HTMLElement>();
  const [menuOpen, setMenuOpen] = useState(false);
  const cx = w / 2;
  const cy = h / 2;
  const radiusPx = Math.max(0, Math.min(cx, cy) - EDGE_PAD);
  const pxPerMi = radiusMi > 0 ? radiusPx / radiusMi : 0;
  const ringMi = [radiusMi / 3, (radiusMi * 2) / 3, radiusMi];
  const fmtMi = (mi: number) => `${Number.isInteger(mi) ? mi : mi.toFixed(1)}MI`;
  const tiles = useMemo(() => tilesFor(home.lat, home.lon, pxPerMi, cx, cy, w, h), [home.lat, home.lon, pxPerMi, cx, cy, w, h]);

  return (
    <section ref={ref} className="map" aria-label="Map of nearby flights">
      {w > 0 && (
        <>
          <div className="map__tiles" aria-hidden="true">
            {tiles.map((t) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={t.key} src={t.src} alt="" draggable={false} style={{ left: t.left, top: t.top, width: t.size, height: t.size }} />
            ))}
          </div>
          <div className="map__tiles map__tiles--labels" aria-hidden="true">
            {tiles.map((t) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={t.key} src={t.labelSrc} alt="" draggable={false} style={{ left: t.left, top: t.top, width: t.size, height: t.size }} />
            ))}
          </div>
          <svg className="map__svg" width={w} height={h} aria-hidden="true">
            <defs>
              <pattern id="map-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M24 0H0V24" fill="none" stroke="var(--map-grid)" />
              </pattern>
              <radialGradient id="map-glow" cx={cx} cy={cy} r={radiusPx * 1.3} gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="var(--map-glow)" stopOpacity="0.9" />
                <stop offset="1" stopColor="var(--map-bg)" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width={w} height={h} fill="url(#map-glow)" />
            <g fill="none" stroke="var(--map-ring)">
              {ringMi.map((mi, i) => (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={mi * pxPerMi}
                  strokeOpacity={[0.9, 0.6, 0.45][i]}
                  strokeDasharray={i === 0 ? undefined : "2 5"}
                />
              ))}
              <path d={`M${cx} ${cy - radiusPx}V${cy + radiusPx}M${cx - radiusPx} ${cy}H${cx + radiusPx}`} strokeOpacity="0.35" />
            </g>
            <g fontFamily="var(--font-mono)" fontSize="10" letterSpacing="1">
              {ringMi.map((mi, i) => {
                const y = cy - mi * pxPerMi - 8;
                return (
                  <g key={i}>
                    <rect x={cx + 18} y={y} width={40} height={16} rx={8} fill="#0c1b3c" />
                    <text x={cx + 24} y={y + 11} fill="#a4a9b3">
                      {fmtMi(mi)}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {flights.map((f) => {
            const o = offsetMi(home.lat, home.lon, f.lat, f.lon);
            const x = cx + o.x * pxPerMi;
            const y = cy - o.y * pxPerMi;
            const sel = f.icao24 === selectedId;
            return (
              <div
                key={`t-${f.icao24}`}
                className={`trail${sel ? " trail--selected" : ""}`}
                style={{ left: x, top: y, width: 40 + Math.round((f.speedKt ?? 0) / 5), transform: `rotate(${f.headingDeg + 90}deg)` }}
              />
            );
          })}

          <div className="map__home" style={{ left: cx, top: cy }}>
            <HomeIcon color="var(--amber-ink)" strokeWidth={2.4} />
          </div>

          {flights.map((f) => {
            const o = offsetMi(home.lat, home.lon, f.lat, f.lon);
            const sel = f.icao24 === selectedId;
            const hov = f.icao24 === hoverId;
            const from = f.origin?.iata ?? f.origin?.icao ?? "—";
            const to = f.destination?.iata ?? f.destination?.icao ?? "—";
            return (
              <div
                key={f.icao24}
                className={`plane${sel ? " plane--selected" : ""}${hov ? " plane--hover" : ""}`}
                style={{ left: cx + o.x * pxPerMi, top: cy - o.y * pxPerMi }}
              >
                <button
                  type="button"
                  className="plane__btn"
                  aria-pressed={sel}
                  aria-label={`${f.flightNumber}, ${from} to ${to}, ${f.distanceMi.toFixed(1)} miles away`}
                  onClick={() => onSelect(f.icao24)}
                  onMouseEnter={() => onHover(f.icao24)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(f.icao24)}
                  onBlur={() => onHover(null)}
                >
                  <span className="plane__halo">
                    <PlaneIcon className="plane__icon" style={{ transform: `rotate(${f.headingDeg}deg)` }} />
                  </span>
                  <span className="plane__tag">
                    <span className="plane__callsign">{f.callsign}</span>
                    <span className="plane__alt">
                      {f.altitudeFt === null ? "—" : `FL${String(Math.round(f.altitudeFt / 100)).padStart(3, "0")}`}
                    </span>
                  </span>
                </button>
                {hov && (
                  <div className="tooltip" role="tooltip">
                    <div className="tooltip__top">
                      <span>{f.airlineName ?? "Unknown airline"}</span>
                      <span style={{ fontFamily: "var(--font-mono)" }}>{f.distanceMi.toFixed(1)} mi away</span>
                    </div>
                    <div className="tooltip__route">
                      <span>{from}</span>
                      <ArrowRightIcon color="#4a5a78" />
                      <span>{to}</span>
                    </div>
                    <div className="tooltip__meta">
                      <span>{f.altitudeFt === null ? "—" : `${f.altitudeFt.toLocaleString("en-US")} ft`}</span>
                      <span>{f.speedKt === null ? "—" : `${f.speedKt} kt`}</span>
                      <span>Click to pin</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="radius">
            <button
              type="button"
              className="map-chip map-chip--radius"
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <RadarIcon color="var(--sky)" />
              <span>{radiusMi} mi radius</span>
              <ChevronIcon />
            </button>
            {menuOpen && (
              <ul className="radius__menu" role="listbox" aria-label="Search radius">
                {RADIUS_OPTIONS.map((mi) => (
                  <li key={mi} role="option" aria-selected={mi === radiusMi}>
                    <button
                      type="button"
                      className={`radius__opt${mi === radiusMi ? " radius__opt--on" : ""}`}
                      onClick={() => {
                        onRadiusChange(mi);
                        setMenuOpen(false);
                      }}
                    >
                      {mi} mi
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="compass" role="img" aria-label="North is up">
            <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
              <path d="M20 5l4 15h-8z" fill="var(--amber)" />
              <path d="M20 35l-4-15h8z" fill="#3a5a90" />
            </svg>
          </div>
          <div className="map-chip map-chip--hint">
            <CursorIcon color="var(--text-muted)" />
            <span>Hover a plane for details · click to pin it to the top of the list</span>
          </div>
          <div className="scale">
            <span className="scale__bar" style={{ width: (radiusMi / 3) * pxPerMi }} />
            <span>{fmtMi(radiusMi / 3)} · © OpenSky Network · {TILE_ATTRIBUTION}</span>
          </div>
          {status && <div className="map-status">{status}</div>}
        </>
      )}
    </section>
  );
}
