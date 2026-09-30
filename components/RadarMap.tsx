"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { offsetMi } from "@/lib/geo";
import { TILE_ATTRIBUTION, tilesFor } from "@/lib/tiles";
import type { Flight, Home } from "@/lib/types";
import { ArrowRightIcon, ChevronIcon, CrosshairIcon, CursorIcon, HomeIcon, MinusIcon, PlaneIcon, PlusIcon, RadarIcon } from "./icons";

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

// View = zoom multiplier on the fit-the-radius scale, and the map center's offset
// from home in miles (x = east, y = north).
const HOME_VIEW = { k: 1, x: 0, y: 0 };
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 12;
const DRAG_THRESHOLD_PX = 5;
const SCALE_STEPS_MI = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Largest round distance whose scale bar fits in ~120px. */
const scaleMi = (pxPerMi: number) => [...SCALE_STEPS_MI].reverse().find((mi) => mi * pxPerMi <= 120) ?? SCALE_STEPS_MI[0];

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
  const [view, setView] = useState(HOME_VIEW);
  const [moving, setMoving] = useState(false);
  const movingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ startX: 0, startY: 0, dragging: false, pinchDist: 0 });

  const cx = w / 2;
  const cy = h / 2;
  const fitPxPerMi = radiusMi > 0 ? Math.max(0, Math.min(cx, cy) - EDGE_PAD) / radiusMi : 0;
  const pxPerMi = fitPxPerMi * view.k;
  // Home's position on screen; everything is drawn relative to it.
  const hx = cx - view.x * pxPerMi;
  const hy = cy + view.y * pxPerMi;
  const radiusPx = radiusMi * pxPerMi;
  const ringMi = [radiusMi / 3, (radiusMi * 2) / 3, radiusMi];
  const fmtMi = (mi: number) => `${Number.isInteger(mi) ? mi : mi.toFixed(1)}MI`;
  const barMi = scaleMi(pxPerMi);
  const tiles = useMemo(() => tilesFor(home.lat, home.lon, pxPerMi, hx, hy, w, h), [home.lat, home.lon, pxPerMi, hx, hy, w, h]);
  const atHome = view.k === 1 && view.x === 0 && view.y === 0;

  // A new home or radius starts from the default view.
  useEffect(() => setView(HOME_VIEW), [home.lat, home.lon, radiusMi]);

  // Planes glide between position updates; that transition must be off while the view moves.
  const markMoving = useCallback(() => {
    setMoving(true);
    clearTimeout(movingTimer.current);
    movingTimer.current = setTimeout(() => setMoving(false), 200);
  }, []);

  /** Zoom by `factor`, keeping the point under (sx, sy) fixed on screen. */
  const zoomAt = useCallback(
    (factor: number, sx = cx, sy = cy) => {
      if (fitPxPerMi <= 0) return;
      setView((v) => {
        const k = clamp(v.k * factor, MIN_ZOOM, MAX_ZOOM);
        const before = fitPxPerMi * v.k;
        const after = fitPxPerMi * k;
        return {
          k,
          x: v.x + (sx - cx) / before - (sx - cx) / after,
          y: v.y - (sy - cy) / before + (sy - cy) / after,
        };
      });
      markMoving();
    },
    [cx, cy, fitPxPerMi, markMoving],
  );

  // Wheel / trackpad zoom. Attached natively because React's wheel listener is passive.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002)), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref, zoomAt]);

  const localPoint = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || (e.target as Element).closest("[data-no-pan]")) return;
    if (e.pointerType === "mouse") pointers.current.clear();
    const p = localPoint(e);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (pointers.current.size === 1) {
      Object.assign(g, { startX: p.x, startY: p.y, dragging: false });
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      g.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const p = localPoint(e);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;

    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.pinchDist > 0) zoomAt(dist / g.pinchDist, (a.x + b.x) / 2, (a.y + b.y) / 2);
      g.pinchDist = dist;
      g.dragging = true;
      return;
    }
    if (!g.dragging) {
      if (Math.hypot(p.x - g.startX, p.y - g.startY) < DRAG_THRESHOLD_PX) return;
      // Only capture once it's a real drag, so a plain click still reaches the plane button.
      g.dragging = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    setView((v) => ({ ...v, x: v.x - dx / (fitPxPerMi * v.k), y: v.y + dy / (fitPxPerMi * v.k) }));
    markMoving();
  };

  const onPointerEnd = (e: PointerEvent<HTMLElement>) => {
    pointers.current.delete(e.pointerId);
    gesture.current.pinchDist = 0;
  };

  // Swallow the click that ends a drag so it doesn't pin a plane.
  const onClickCapture = (e: MouseEvent<HTMLElement>) => {
    if (!gesture.current.dragging) return;
    gesture.current.dragging = false;
    e.stopPropagation();
  };

  return (
    <section
      ref={ref}
      className={`map${moving ? " map--moving" : ""}`}
      aria-label="Map of nearby flights"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={onClickCapture}
    >
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
              <radialGradient id="map-glow" cx={hx} cy={hy} r={radiusPx * 1.3} gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="var(--map-glow)" stopOpacity="0.9" />
                <stop offset="1" stopColor="var(--map-bg)" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width={w} height={h} fill="url(#map-glow)" />
            <g fill="none" stroke="var(--map-ring)">
              {ringMi.map((mi, i) => (
                <circle
                  key={i}
                  cx={hx}
                  cy={hy}
                  r={mi * pxPerMi}
                  strokeOpacity={[0.9, 0.6, 0.45][i]}
                  strokeDasharray={i === 0 ? undefined : "2 5"}
                />
              ))}
              <path d={`M${hx} ${hy - radiusPx}V${hy + radiusPx}M${hx - radiusPx} ${hy}H${hx + radiusPx}`} strokeOpacity="0.35" />
            </g>
            <g fontFamily="var(--font-mono)" fontSize="10" letterSpacing="1">
              {ringMi.map((mi, i) => {
                const y = hy - mi * pxPerMi - 8;
                return (
                  <g key={i}>
                    <rect x={hx + 18} y={y} width={40} height={16} rx={8} fill="#0c1b3c" />
                    <text x={hx + 24} y={y + 11} fill="#a4a9b3">
                      {fmtMi(mi)}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {flights.map((f) => {
            const o = offsetMi(home.lat, home.lon, f.lat, f.lon);
            const x = hx + o.x * pxPerMi;
            const y = hy - o.y * pxPerMi;
            const sel = f.icao24 === selectedId;
            return (
              <div
                key={`t-${f.icao24}`}
                className={`trail${sel ? " trail--selected" : ""}`}
                style={{ left: x, top: y, width: 40 + Math.round((f.speedKt ?? 0) / 5), transform: `rotate(${f.headingDeg + 90}deg)` }}
              />
            );
          })}

          <div className="map__home" style={{ left: hx, top: hy }}>
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
                style={{ left: hx + o.x * pxPerMi, top: hy - o.y * pxPerMi }}
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

          <div className="radius" data-no-pan>
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
          <div className="map-zoom" data-no-pan>
            <button type="button" className="map-zoom__btn" aria-label="Zoom in" disabled={view.k >= MAX_ZOOM} onClick={() => zoomAt(1.5)}>
              <PlusIcon />
            </button>
            <button type="button" className="map-zoom__btn" aria-label="Zoom out" disabled={view.k <= MIN_ZOOM} onClick={() => zoomAt(1 / 1.5)}>
              <MinusIcon />
            </button>
            <button
              type="button"
              className="map-zoom__btn"
              aria-label="Recenter on home"
              disabled={atHome}
              onClick={() => {
                setView(HOME_VIEW);
                markMoving();
              }}
            >
              <CrosshairIcon />
            </button>
          </div>
          <div className="compass" role="img" aria-label="North is up">
            <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
              <path d="M20 5l4 15h-8z" fill="var(--amber)" />
              <path d="M20 35l-4-15h8z" fill="#3a5a90" />
            </svg>
          </div>
          <div className="map-chip map-chip--hint">
            <CursorIcon color="var(--text-muted)" />
            <span>Drag to pan · scroll to zoom · click a plane to pin it</span>
          </div>
          <div className="scale">
            <span className="scale__bar" style={{ width: barMi * pxPerMi }} />
            <span>{fmtMi(barMi)} · adsb.lol (ODbL) · {TILE_ATTRIBUTION}</span>
          </div>
          {status && <div className="map-status">{status}</div>}
        </>
      )}
    </section>
  );
}
