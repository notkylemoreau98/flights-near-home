"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { GeocodeResponse, Home } from "@/lib/types";
import { PencilIcon } from "./icons";

interface Props {
  home: Home;
  onHomeChange: (home: Home) => void;
  count: number;
  nearestMi: number | null;
  lowestFt: number | null;
  fetchedAt: number | null;
  stale: boolean;
}

export default function Header({ home, onHomeChange, count, nearestMi, lowestFt, fetchedAt, stale }: Props) {
  return (
    <header className="header">
      <AddressEditor home={home} onSave={onHomeChange} />
      <div className="stats">
        <Stat label="In range" value={String(count)} unit="aircraft" />
        <Stat label="Nearest" value={nearestMi === null ? "—" : nearestMi.toFixed(1)} unit="mi" />
        <Stat label="Lowest" value={lowestFt === null ? "—" : lowestFt.toLocaleString("en-US")} unit="ft" />
        <LiveStatus fetchedAt={fetchedAt} stale={stale} />
      </div>
    </header>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className="stat__value">
        {value}
        <span className="stat__unit">{unit}</span>
      </span>
    </div>
  );
}

function LiveStatus({ fetchedAt, stale }: { fetchedAt: number | null; stale: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);
  const ago = fetchedAt ? Math.max(0, Math.round((now - fetchedAt) / 1000)) : null;
  const label = ago === null ? "Connecting…" : ago < 10 ? "Live · adsb.lol" : `Updated ${ago < 90 ? `${ago}s` : `${Math.round(ago / 60)}m`} ago`;
  return (
    <div className="stat stat--live" aria-live="polite">
      <span className={`live-dot${stale ? " live-dot--stale" : ""}`} />
      <span>{label}</span>
    </div>
  );
}

function AddressEditor({ home, onSave }: { home: Home; onSave: (home: Home) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(home.address);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editBtn = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);

  useEffect(() => {
    // Return focus to the Edit button after closing the form.
    if (wasEditing.current && !editing) editBtn.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  const start = () => {
    setDraft(home.address);
    setError(null);
    setEditing(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const q = draft.trim();
    if (!q || q === home.address) return setEditing(false);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as GeocodeResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "Address lookup failed.");
      onSave({ address: data.address, lat: data.lat, lon: data.lon });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Address lookup failed.");
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") setEditing(false);
  };

  return (
    <div className="header__address">
      <div className="eyebrow">
        <span className="eyebrow__dot" />
        <span>Watching the sky over</span>
      </div>

      {editing ? (
        <form className="address-form" onSubmit={submit}>
          <label htmlFor="home-address" className="sr-only">
            Home address
          </label>
          <input
            id="home-address"
            className="address-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Street, city, state"
            autoComplete="street-address"
            autoFocus
            disabled={busy}
          />
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? "Finding…" : "Save"}
          </button>
          <button type="button" className="btn" onClick={() => setEditing(false)} disabled={busy}>
            Cancel
          </button>
          {error && (
            <span className="address-error" role="alert">
              {error}
            </span>
          )}
        </form>
      ) : (
        <div className="address-row">
          <h1 className="address" title={home.address}>
            {home.address}
          </h1>
          <button ref={editBtn} type="button" className="btn" onClick={start}>
            <PencilIcon />
            <span>Edit address</span>
          </button>
        </div>
      )}
    </div>
  );
}
