"use client";

import { useState } from "react";
import { AIRLINES } from "@/lib/airlines";

/**
 * Airline logo from a public logo CDN (by IATA code), falling back to a
 * colored tile with the airline code. Swap LOGO_URL for your own source if you like.
 */
const LOGO_URL = (iata: string) => `https://pics.avs.io/88/88/${iata}.png`;

export default function AirlineLogo({ iata, callsign }: { iata: string | null; callsign: string }) {
  const [failed, setFailed] = useState(false);
  const icao = callsign.slice(0, 3).toUpperCase();
  const fallback = AIRLINES[icao];
  const code = iata || fallback?.iata || callsign.slice(0, 2);

  if (iata && !failed) {
    return (
      <span className="logo logo--image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_URL(iata)} alt="" loading="lazy" onError={() => setFailed(true)} />
      </span>
    );
  }
  return (
    <span className="logo" style={{ background: fallback?.color ?? "#3a3f47", color: fallback?.ink ?? "#fff" }} aria-hidden="true">
      {code}
    </span>
  );
}
